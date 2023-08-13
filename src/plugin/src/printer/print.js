import { builders } from "prettier/doc";
import { util } from "prettier";

const {
    breakParent,
    join,
    line,
    lineSuffix,
    group,
    conditionalGroup,
    indent,
    dedent,
    ifBreak,
    hardline,
    softline,
    literalline,
    align,
    dedentToRoot,
    concat,
    indentIfBreak,
    lineSuffixBoundary
} = builders;

import {
    isLastStatement,
    optionalSemicolon,
    isNextLineEmpty,
    shouldAddNewlinesAroundStatement
} from "./util.js";

import {
    printDanglingComments,
    printDanglingCommentsAsGroup
} from "./comments.js";

export function print(path, options, print) {
    const node = path.getValue();

    if (!node) {
        return concat("");
    }

    if (typeof node === "string") {
        return concat(node);
    } else if (Array.isArray(node)) {
        return concat(path.map(print));
    }
    

    return printNode(node, path, options, print);

}

function printNode(node, path, options, print) {
    switch (node.type) {
        case "Program": {
            if (node.body.length === 0) {
                return concat(printDanglingComments(path, options, true));
            }
            return concat(printStatements(path, options, print, "body"));
        }
        case "BlockStatement": {
            if (node.body.length === 0) {
                return concat(printEmptyBlock(path, options, print));
            }

            return concat([
                "{",
                printDanglingComments(
                    path,
                    options,
                    true,
                    (comment) => comment.attachToBrace
                ),
                indent([
                    hardline, // the first statement of a non-empty block must begin on its own line.
                    printStatements(path, options, print, "body")
                ]),
                hardline,
                "}"
            ]);
        }
        case "IfStatement": {
            const parts = [];
            parts.push(
                printSingleClauseStatement(path, options, print, "if", "test", "consequent")
            );

            if (node.alternate != null) {
                // don't add braces to else-if
                const elseBlock =
                    node.alternate.type === "IfStatement"
                        ? print("alternate")
                        : printInBlock(path, options, print, "alternate");
                parts.push([
                    " else ",
                    elseBlock
                ]);
            }
            return concat(parts);
        }
        case "SwitchStatement": {
            const parts = [];
            parts.push([
                "switch (",
                group([indent([ifBreak(line), print("discriminant")]), ifBreak(line)]),
                ") "
            ]);
            if (node.cases.length === 0) {
                parts.push(printEmptyBlock(path, options, print));
            } else {
                parts.push([
                    "{",
                    indent([
                        path.map(print, "cases")
                    ]),
                    hardline,
                    "}"
                ]);
            }
            return concat(parts);
        }
        case "SwitchCase": {
            const caseText = node.test !== null ? "case " : "default";
            const parts = [[hardline, caseText, print("test"), ":"]];
            if (node.consequent !== null) {
                parts.push([
                    indent([
                        hardline,
                        printStatements(path, options, print, "body")
                    ])
                ]);
            }
            return concat(parts);
        }
        case "TernaryExpression": {
            return group([
                print("test"),
                indent([
                    line,
                    "? ", print("consequent"),
                    line,
                    ": ", print("alternate")
                ])
            ]);
        }
        case "ForStatement": {
            return concat([
                "for (",
                group([
                    indent([
                        ifBreak(line),
                        concat([print("init"), ";", line, print("test"), ";", line, print("update")])
                    ])
                ]),
                ") ",
                printInBlock(path, options, print, "body")
            ]);
        }        
        case "DoUntilStatement": {
            return concat([
                "do ",
                printInBlock(path, options, print, "body"),
                " until (",
                group([indent([ifBreak(line), print("test")]), ifBreak(line)]),
                ") "
            ]);
        }
        case "WhileStatement": {
            return concat(printSingleClauseStatement(path, options, print, "while", "test", "body"));
        }
        case "RepeatStatement": {
            return concat(printSingleClauseStatement(path, options, print, "repeat", "test", "body"));
        }
        case "WithStatement": {
            return concat(printSingleClauseStatement(path, options, print, "with", "test", "body"));
        }
        case "FunctionDeclaration":
        case "ConstructorDeclaration": {
            const parts = [];
            parts.push(["function", node.id ? " " : "", print("id")]);

            if (node.params.length > 0) {
                parts.push(
                    printDelimitedList(path, print, "params", "(", ")", {
                        delimiter: ",",
                        allowTrailingDelimiter: false
                    })
                );
            } else {
                parts.push(printEmptyParens(path, print, options));
            }

            if (node.type == "ConstructorDeclaration") {
                if (node.parent) {
                    parts.push(print("parent"));
                } else {
                    parts.push(" constructor");
                }
            }

            parts.push(" ");
            parts.push(printInBlock(path, options, print, "body"));
            return concat(parts);
        }
        case "ConstructorParentClause": {
            let params;
            if (node.params.length > 0) {
                params = printDelimitedList(path, print, "params", "(", ")", {
                    delimiter: ",",
                    allowTrailingDelimiter: options.trailingComma === "all"
                });
            } else {
                params = printEmptyParens(path, print, options);
            }
            return concat([
                " : ",
                print("id"),
                params,
                " constructor"
            ]);
        }
        case "DefaultParameter": {
            return concat(printSimpleDeclaration(print("left"), print("right")));
        }
        case "AssignmentExpression": {
            return group([
                group(print("left")),
                " ",
                node.operator,
                " ",
                group(print("right"))
            ]);
        }
        case "GlobalVarStatement":
        case "VariableDeclaration": {
            let decls = [];
            if (node.declarations.length > 1) {
                decls = printDelimitedList(path, print, "declarations", "", "", {
                    delimiter: ",",
                    allowTrailingDelimiter: options.trailingComma === "all",
                    leadingNewline: false,
                    trailingNewline: false
                });
            } else {
                decls = path.map(print, "declarations");
            }
            return concat([node.kind, " ", decls]);
        }
        case "VariableDeclarator": {
            return concat(printSimpleDeclaration(print("id"), print("init")));
        }
        case "ParenthesizedExpression": {
            const expressionNode = node.expression;
            if (expressionNode.type === "ParenthesizedExpression") {
                // If the inner expression is already parenthesized, don't add additional parentheses
                return print("expression");
            }
            return concat(["(", print("expression"), ")"]);
        }
        case "BinaryExpression": {
            let left = print("left");
            let operator = node.operator;
            let right = print("right");

            // Check if the operator is division and the right-hand side is 2
            if (operator === "/" && node.right.value === "2") {
                operator = "*";
                right = "0.5";
            } else if (operator === "&&") { // TODO add option to specify if we want 'and' or '&&'
                operator = "and";
            } else if (operator === "||") {
                operator = "or";
            } else if (operator === "%") {
                operator = "mod";
            } else if (operator === "^^") {
                operator = "xor";
            } else if (operator === "<>") {
                operator = "!=";
            }

            // Check precedence
            // if (needsParentheses(node.left, node)) {
            //     left = concat(["(", left, ")"]);
            // }
            // if (needsParentheses(node.right, node)) {
            //     right = concat(["(", right, ")"]);
            // }

            // return group([
            //     left,
            //     " ",
            //     group([operator, line, right]),
            // ]);
            // const formattedBinExp = formatBinaryExpression(node);
            // if (needsParentheses(node.left, node)) {
            //     left = concat(["(", left, ")"]);
            // }
            // if (needsParentheses(node.right, node)) {
            //     right = concat(["(", right, ")"]);
            // }

            // if (parentOp && needsParentheses(node.operator, parentOp)) {
            //     return group(["(", node.left, " ", node.operator, " ", node.right, ")"]);
            // }
            // return group([node.left, " ", node.operator, " ", node.right]);
    
            // return group(formattedBinExp);

            // if (node.left.type == "BinaryExpression") {
            //     return printNode(node.left, path, options, print);
            // }

            // if (node.right.type == "BinaryExpression") {
            //     return printNode(node.right, path, options, print);
            // }

            // if (needsParentheses(node.left, node)) {
            //     left = concat(["(", left, ")"]);
            // }
            
            // if (needsParentheses(node.right, node)) {
            //     right = concat(["(", right, ")"]);
            // }
            
            return group([
                left,
                " ",
                group([operator, line, right])
            ]);
        }
        case "UnaryExpression":
        case "IncDecStatement":
        case "IncDecExpression":
            if (node.prefix) {
                return concat([node.operator, print("argument")]);
            } else {
                return concat([print("argument"), node.operator]);
            }
        case "CallExpression": {
            let printedArgs = [];
        
            if (node.arguments.length === 0) {
                printedArgs = [printEmptyParens(path, print, options)];
            } else if (
                [node.arguments[0], node.arguments[node.arguments.length - 1]].some(
                    (node) =>
                        node.type === "FunctionDeclaration" ||
                        node.type === "StructExpression"
                )
            ) {
                // treat this function like it has a callback
                let optionA = printDelimitedList(path, print, "arguments", "(", ")", {
                    addIndent: false,
                    forceInline: true,
                    delimiter: ",",
                    allowTrailingDelimiter: options.trailingComma === "all",
                    leadingNewline: false,
                    trailingNewline: false
                });
        
                let optionB = printDelimitedList(path, print, "arguments", "(", ")", {
                    delimiter: ",",
                    allowTrailingDelimiter: options.trailingComma === "all"
                });
        
                printedArgs = [conditionalGroup([optionA, optionB])];
            } else {
                printedArgs = [printDelimitedList(path, print, "arguments", "(", ")", {
                    delimiter: ",",
                    allowTrailingDelimiter: options.trailingComma === "all"
                })];
            }
        
            if (isInLValueChain(path)) {
                return concat([print("object"), ...printedArgs]);
            } else {
                return group([indent(print("object")), ...printedArgs]);
            }
        }                     
        case "MemberDotExpression": {
            // return [
            //     print("object"),
            //     ".",
            //     print("property")
            // ];
            if (isInLValueChain(path) && path.parent?.type === "CallExpression") {
                // this dot expression is part of a call expression, so add a line break
                return concat([
                    print("object"),
                    softline,
                    ".",
                    print("property")
                ]);
            } else {
                // return [
                //     print("object"),
                //     ".",
                //     print("property")
                // ];
                let property = print("property");
                if (property === undefined) {
                    property = printDelimitedList(path, print, "property", "", "", {
                        delimiter: ",",
                        allowTrailingDelimiter: options.trailingComma === "all"
                    });
                }
                return concat([
                    print("object"),
                    ".",
                    group(indent(property))
                ]);
                // return [
                //     print("object"),
                //     ".",
                //     print("property")
                // ];
            }
        }
        case "MemberIndexExpression": {
            let accessor = print("accessor");
            if (accessor.length > 1) {
                accessor += " ";
            }
            let property = print("property");
            if (property === undefined) {
                property = printDelimitedList(path, print, "property", "", "", {
                    delimiter: ",",
                    allowTrailingDelimiter: options.trailingComma === "all"
                });
            }
            return concat([
                print("object"),
                accessor,
                group(indent(property)),
                "]"
            ]);
        }
        case "StructExpression": {
            if (node.properties.length === 0) {
                return concat(printEmptyBlock(path, options, print));
            }
            return concat(printDelimitedList(path, print, "properties", "{", "}", {
                delimiter: ",",
                allowTrailingDelimiter: options.trailingComma === "all",
                forceBreak: node.hasTrailingComma,
                // TODO: decide whether to add bracket spacing for struct expressions
                padding: ""
            }));
        }
        case "Property": {
            return concat([print("name"), ": ", print("value")]);
        }
        case "ArrayExpression": {
            const allowTrailingComma = options.trailingComma === "all";
            return concat(printDelimitedList(path, print, "elements", "[", "]", {
                delimiter: ",",
                allowTrailingDelimiter: allowTrailingComma,
                forceBreak: allowTrailingComma && node.hasTrailingComma
            }));
        }
        case "EnumDeclaration": {
            return concat([
                "enum ",
                print("name"),
                " ",
                printDelimitedList(path, print, "members", "{", "}", {
                    delimiter: ",",
                    allowTrailingDelimiter: options.trailingComma === "all",
                    forceBreak: node.hasTrailingComma
                })
            ]);
        }
        case "ReturnStatement": {
            if (node.argument) {
                return concat(["return ", print("argument")]);
            } else {
                return concat("return");
            }
        }
        case "ThrowStatement": {
            if (node.argument) {
                return concat(["throw ", print("argument")]);
            } else {
                return "throw";
            }
        }
        case "MacroDeclaration": {
        // can't touch this
            return options.originalText.slice(node.start.index, node.end.index + 1);
        }
        case "RegionStatement": {
            return concat(["#region", print("name")]);
        }
        case "EndRegionStatement": {
            return concat(["#endregion", print("name")]);
        }
        case "DefineStatement": {
            return concat(["#define", print("name")]);
        }
        case "DeleteStatement": {
            return concat(["delete ", print("argument")]);
        }
        case "BreakStatement": {
            return concat("break");
        }
        case "ExitStatement": {
            return concat("exit");
        }
        case "ContinueStatement": {
            return concat("continue");
        }
        case "EmptyStatement": {
            return concat("");
        }
        case "Literal": {  // TODO add option to allow missing trailing/leading zeroes
            let value = node.value;
            if (value.startsWith(".") && !value.startsWith("\"")) {
                value = "0" + value;  // fix decimals without a leading 0
            }
            if (value.endsWith(".") && !value.endsWith("\"")) {
                value = value + "0";  // fix decimals without a trailing 0
            }
            return concat(value);
        }
        case "Identifier": {
            return concat(node.name);
        }
        case "TemplateStringText": {
            return concat(node.value);
        }
        case "MissingOptionalArgument": {
            return concat("undefined"); // TODO: Add plugin option to choose undefined or just empty comma
        }
        case "NewExpression": {
            let argsPrinted;
            if (node.arguments.length === 0) {
                argsPrinted = [printEmptyParens(path, print, options)];
            } else {
                argsPrinted = [printDelimitedList(path, print, "arguments", "(", ")", {
                    delimiter: ",",
                    allowTrailingDelimiter: options.trailingComma === "all"
                })];
            }
            return concat(["new ", print("expression"), ...argsPrinted]);
        }           
        case "EnumMember": {
            return concat(printSimpleDeclaration(
                print("name"), print("initializer")
            ));
        }
        case "CatchClause": {
            const parts = [];
            parts.push(" catch ");
            if (node.param) {
                parts.push(["(", print("param"), ")"]);
            }
            if (node.body) {
                parts.push(" ", printInBlock(path, options, print, "body"));
            }
            return concat(parts);
        }
        case "Finalizer": {
            const parts = [];
            parts.push(" finally ");
            if (node.body) {
                parts.push(printInBlock(path, options, print, "body"));
            }
            return concat(parts);
        }
        case "TryStatement": {
            return concat([
                "try ",
                printInBlock(path, options, print, "block"),
                print("handler"),
                print("finalizer")
            ]);
        }
        case "TemplateStringExpression": {
            const parts = [];
            parts.push("$\"");
            node.atoms.forEach((atom, index) => {
                if (atom.type === "TemplateStringText") {
                    parts.push(atom.value);
                } else {
                    parts.push("{", path.map(print, "atoms")[index], "}");
                }
            });
            parts.push("\"");
            return concat(parts);
        }        
        default:
            console.warn("Print.js:print encountered unhandled node type: " + node.type, node);
    }

}

function printDelimitedList(
    path,
    print,
    listKey,
    startChar,
    endChar,
    {
        delimiter = ",",
        allowTrailingDelimiter = false,
        leadingNewline = true,
        trailingNewline = true,
        forceBreak = false,
        padding = "",
        addIndent = true,
        groupId = undefined,
        forceInline = false
    } = delimiterOptions
) {
    const lineBreak = forceBreak ? hardline : line;
    const finalDelimiter = allowTrailingDelimiter ? delimiter : "";

    const innerDoc = [
        ifBreak(leadingNewline ? lineBreak : "", padding),
        printElements(path, print, listKey, delimiter, lineBreak)
    ];

    const groupElements = [
        startChar,
        addIndent ? indent(innerDoc) : innerDoc,
        // always print a trailing delimiter if the list breaks
        ifBreak([finalDelimiter, trailingNewline ? lineBreak : ""], padding),
        endChar
    ];

    const groupElementsNoBreak = [
        startChar,
        padding,
        printElements(path, print, listKey, delimiter, " "),
        padding,
        endChar
    ];

    if (forceInline) {
        return groupElementsNoBreak;
    } else {
        return group(groupElements, { groupId });
    }
}

// wrap a statement in a block if it's not already a block
function printInBlock(path, options, print, expressionKey) {
    const node = path.getValue()[expressionKey];
    if (node.type !== "BlockStatement") {
        return [
            "{",
            indent([
                hardline,
                print(expressionKey),
                optionalSemicolon(node.type)
            ]),
            hardline,
            "}"
        ];
    } else {
        return [print(expressionKey), optionalSemicolon(node.type)];
    }
}

// print a delimited sequence of elements
// handles the case where a trailing comment follows a delimiter
function printElements(path, print, listKey, delimiter, lineBreak) {
    const node = path.getValue();
    const finalIndex = node[listKey].length - 1;
    return path.map((childPath, index) => {
        const parts = [];
        const printed = print();
        const separator = (index !== finalIndex ? delimiter : "");

        if (docHasTrailingComment(printed)) {
            printed.splice(printed.length - 1, 0, separator);
            parts.push(printed);
        } else {
            parts.push(printed);
            parts.push(separator);
        }

        if (index !== finalIndex) {
            parts.push(lineBreak);
        }

        return parts;
    }, listKey);
}

// variation of printElements that handles semicolons and line breaks in a program or block
function printStatements(path, options, print, childrenAttribute) {
    let precedingBlankLineExists = true;
    return path.map((childPath, index) => {
        const parts = [];
        const node = childPath.getValue();
        const isTopLevel = childPath.parent?.type === "Program";
        const printed = print();
        const semi = optionalSemicolon(node.type);

        const addNewlinePadding = shouldAddNewlinesAroundStatement(node, options) && isTopLevel;
        if (addNewlinePadding && !precedingBlankLineExists) {
            parts.push(hardline);
        }
        precedingBlankLineExists = false;

        if (docHasTrailingComment(printed)) {
            printed.splice(printed.length - 1, 0, semi);
            parts.push(printed);
        } else {
            parts.push(printed);
            parts.push(semi);
        }

        if (!isLastStatement(childPath)) {
            parts.push(hardline);
            if (isNextLineEmpty(options.originalText, node.end.index + 1)) {
                parts.push(hardline);
                precedingBlankLineExists = true;
            }
        } else if (isTopLevel) {
            parts.push(hardline);
        }

        return parts;
    }, childrenAttribute);
}

function docHasTrailingComment(doc) {
    if (Array.isArray(doc) && doc.length > 0) {
        const lastItem = doc[doc.length - 1];
        if (Array.isArray(lastItem) && lastItem.length > 0) {
            const commentArr = lastItem[0];
            if (Array.isArray(commentArr) && commentArr.length > 0) {
                return commentArr.some((item) => {
                    return (
                        typeof item === "string" &&
                        (item.startsWith("//") || item.startsWith("/*"))
                    );
                });
            }
        }
    }
    return false;
}

// prints any statement that matches the structure [keyword, clause, statement]
function printSingleClauseStatement(path, options, print, keyword, clauseKey, bodyKey) {
    const clauseNode = path.getValue()[clauseKey];
    let clauseDoc;

    if (clauseNode.type === "ParenthesizedExpression") {
        clauseDoc = print(clauseKey);
    } else {
        clauseDoc = concat(["(", group([indent([ifBreak(line), print(clauseKey)]), ifBreak(line)]), ")"]);
    }

    return concat([keyword, " ", clauseDoc, " ", printInBlock(path, options, print, bodyKey)]);
}

function printSimpleDeclaration(leftDoc, rightDoc) {
    return rightDoc ? [leftDoc, " = ", rightDoc] : leftDoc;
}

// prints empty parens with dangling comments
function printEmptyParens(path, options, print) {
    const printed = group([
        "(",
        indent([
            printDanglingCommentsAsGroup(
                path,
                options,
                true,
                (comment) => !comment.attachToBrace
            )
        ]),
        ifBreak(line, "", { groupId: "emptyparen" }),
        ")"
    ], { id: "emptyparen" });
    return printed;
}

// prints an empty block with dangling comments
function printEmptyBlock(path, options, print) {
    const node = path.getValue();
    if (node?.comments?.length > 0) {
        // an empty block with comments
        return [
            "{",
            printDanglingComments(
                path,
                options,
                true,
                (comment) => comment.attachToBrace
            ),
            printDanglingCommentsAsGroup(
                path,
                options,
                true,
                (comment) => !comment.attachToBrace
            ),
            hardline,
            "}"
        ];
    } else {
        return "{}";
    }
}

// function needsParentheses(innerNode, outerNode) {
//     const precedence = {
//         "and": 0,
//         "&&": 0,
//         "or": 1,
//         "||": 1,
//         "|": 2,
//         "^^": 2,
//         "xor": 2,
//         "&": 3,
//         "=": 4,
//         "<": 4,
//         ">": 4,
//         "<=": 4,
//         ">=": 4,
//         "<>": 4,
//         "!=": 4,
//         "+": 5,
//         "-": 5,
//         "*": 6,
//         "/": 6,
//         "mod": 6
//     };

//     // If innerNode is not a BinaryExpression, it doesn't need parentheses
//     if (innerNode.type !== "BinaryExpression") {
//         return false;
//     }

//     const LOGICAL_OPERATORS = ["and", "&&", "or", "||", "|", "^^", "xor", "&"];
//     const COMPARISON_OPERATORS = ["=", "<", ">", "<=", ">=", "<>", "!=", "=="];
//     const ARITHMETIC_OPERATORS = ["+", "-", "*", "/", "mod", "div", "%"];

//     if (ARITHMETIC_OPERATORS.includes(outerNode.operator) && COMPARISON_OPERATORS.includes(innerNode.operator)) {
//         return false;
//     }

//     // Handling for Test 8: and outer, < inner
//     // if (outerNode.operator === "and" && innerNode.operator === "<") {
//     //     return false;
//     // }

//     const innerPrecedence = precedence[innerNode.operator] || 100;
//     const outerPrecedence = precedence[outerNode.operator] || 100;

//     // For arithmetic outer operators
//     if (ARITHMETIC_OPERATORS.includes(outerNode.operator)) {
//         if (innerPrecedence > outerPrecedence) {
//             return true;
//         }
//         if (innerPrecedence === outerPrecedence && ["-", "/"].includes(outerNode.operator)) {
//             return false;
//         }
//     }

//     // For comparison outer operators
//     if (COMPARISON_OPERATORS.includes(outerNode.operator)) {
//         if (ARITHMETIC_OPERATORS.includes(innerNode.operator)) {
//             return true;
//         }
//     }

//     // For logical outer operators
//     if (LOGICAL_OPERATORS.includes(outerNode.operator)) {
//         if (COMPARISON_OPERATORS.includes(innerNode.operator) || LOGICAL_OPERATORS.includes(innerNode.operator)) {
//             return true;
//         }
//         if (outerNode.operator === "and" && COMPARISON_OPERATORS.includes(innerNode.operator)) {
//             return false;
//         }
//     }

//     return false;
// }

// function needsParentheses(innerNode, outerNode) {
//     const precedence = {
//         "or": 1,
//         "||": 1,
//         "and": 2,
//         "&&": 2,
//         "==": 3,
//         "=": 3,
//         "<": 3,
//         ">": 3,
//         "+": 4,
//         "-": 4,
//         "*": 5,
//         "/": 5
//     };

//     // If innerNode is not a BinaryExpression, it doesn't need parentheses
//     if (innerNode.type !== "BinaryExpression") {
//         return false;
//     }

//     const innerPrecedence = precedence[innerNode.operator] || 100;
//     const outerPrecedence = precedence[outerNode.operator] || 100;

//     // Handle cases where the two operators have different precedence
//     if (innerPrecedence !== outerPrecedence) {
//         if (innerNode.operator === "==" && outerPrecedence > innerPrecedence) {
//             return true;
//         }
//         if ((innerNode.operator === "+" || innerNode.operator === "-") && 
//             (outerNode.operator === "*" || outerNode.operator === "/")) {
//             return true;  // Addition or subtraction inside multiplication or division
//         }
//         return innerPrecedence > outerPrecedence;
//     }

//     // Handle special cases where the two operators have the same precedence
//     if (innerNode.operator === "-") {
//         return true;  // Always use parentheses for sequential subtraction
//     }
//     if (innerNode.operator === "+" && outerNode.operator === "+") {
//         return false;  // Don't use parentheses for sequential addition
//     }
//     if (innerNode.operator === "and" && outerNode.operator === "or") {
//         return true;  // Use parentheses for 'and' followed by 'or'
//     }

//     return false;  // Default to not using parentheses
// }

// const precedence = {
//     "and": 0,
//     "&&": 0,
//     "or": 1,
//     "||": 1,
//     "|": 2,
//     "^^": 2,
//     "xor": 2,
//     "&": 3,
//     "=": 4,
//     "<": 4,
//     ">": 4,
//     "<=": 4,
//     ">=": 4,
//     "<>": 4,
//     "!=": 4,
//     "+": 5,
//     "-": 5,
//     "*": 6,
//     "/": 6,
//     "mod": 6
// };
const precedence = {
    "or": 1,
    "||": 1,
    "and": 2,
    "&&": 2,
    "==": 3,
    "!=": 3,
    "<": 3,
    ">": 3,
    "<=": 3,
    ">=": 3,
    "+": 4,
    "-": 4,
    "*": 5,
    "/": 5,
    "mod": 5
};

const operators = {
    "^": {
        prec: 4,
        assoc: "right"
    },
    "*": {
        prec: 3,
        assoc: "left"
    },
    "/": {
        prec: 3,
        assoc: "left"
    },
    "+": {
        prec: 2,
        assoc: "left"
    },
    "-": {
        prec: 2,
        assoc: "left"
    }
};

// function needsParentheses(innerNode, outerNode) {
//     if (!innerNode || innerNode.type !== "BinaryExpression") {
//         return false;
//     }
    
//     const innerPrecedence = precedence[innerNode.operator] || 0;
//     const outerPrecedence = precedence[outerNode.operator] || 0;
    
//     if (innerPrecedence < outerPrecedence) {
//         return true;
//     } else if (innerPrecedence === outerPrecedence && innerNode.operator === '-') {
//         return true;
//     }

//     return false;
// }

function needsParentheses(innerNode, outerNode) {
    if (!innerNode || innerNode.type !== "BinaryExpression") {
        return false;
    }

    const innerPrecedence = precedence[innerNode.operator] || 0;
    const outerPrecedence = precedence[outerNode.operator] || 0;

    // If the inner operation has equal or lesser precedence than the outer operation, 
    // it needs parentheses.
    return innerPrecedence <= outerPrecedence;
}


function formatBinaryExpression(path, parentOp = null) {
    const node = path.getValue();

    console.log(`Processing node type: ${node.type}, value: ${node.value || "N/A"}`);

    if (!node || node.type !== "BinaryExpression") {
        // return node.value ? [print("value")] : [];
        return printNode(node, path);
    }

    // let left = formatExpression(node.left, node.operator);
    // let right = formatExpression(node.right, node.operator);

    if (parentOp && needsParentheses(node.operator, parentOp)) {
        return ["(", node.left, " ", node.operator, " ", node.right, ")"];
    }
    return [node.left, " ", node.operator, " ", node.right];
}

function isInLValueChain(path) {
    const { node, parent } = path;
    if (
        parent.type === "CallExpression" &&
        parent.arguments.indexOf(node) !== -1
    ) {
        return false;
    }
    return isLValueExpression(parent.type);
}

function isLValueExpression(nodeType) {
    return (
        nodeType === "MemberIndexExpression" ||
        nodeType === "CallExpression" ||
        nodeType === "MemberDotExpression"
    );
}
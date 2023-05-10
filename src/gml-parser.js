import antlr4 from 'antlr4';
import { PredictionMode } from 'antlr4';
import GameMakerLanguageLexer from '../Generated/GameMakerLanguageLexer.js';
import GameMakerLanguageParser from '../Generated/GameMakerLanguageParser.js';
import GameMakerLanguageParserVisitor from '../Generated/GameMakerLanguageParserVisitor.js';
import GameMakerParseErrorListener from './gml-syntax-error.js';

export function parse(
    text, 
    options = {
        getComments: true, 
        getLocationInformation: true
    }
) {
    const getComments = options.getComments;
    const getLocationInformation = options.getLocationInformation;

    const chars = new antlr4.InputStream(text);
    const lexer = new GameMakerLanguageLexer(chars);
    lexer.strictMode = false;
    const tokens = new antlr4.CommonTokenStream(lexer);

    const parser = new GameMakerLanguageParser(tokens);
    //parser._interp.predictionMode = PredictionMode.SLL;
    parser.removeErrorListeners();
    parser.addErrorListener(new GameMakerParseErrorListener());

    console.time();
    try {
        var tree = parser.program();
    } catch (error) {
        console.error(error);
        return null;
    }
    console.timeEnd();

    lexer.reset();
    const comments = getComments ? collectComments(lexer) : [];
    const visitor = new GMLVisitor(comments, getLocationInformation);

    try {
        return visitor.visitProgram(tree);
    } catch (error) {
        console.error(error);
        return null;
    }
}

export function printTokens(text) {
    console.log("===== TOKEN =====" + " ".repeat(14) + "===== TEXT =====");

    const chars = new antlr4.InputStream(text);
    const lexer = new GameMakerLanguageLexer(chars);
    lexer.strictMode = false;
    const names = GameMakerLanguageLexer.symbolicNames;

    for (
        let token = lexer.nextToken();
        token.type != GameMakerLanguageLexer.EOF;
        token = lexer.nextToken()
    ) {
        const name = names[token.type];
        console.log(
            `${name}:${" ".repeat(29 - name.length)} '${token.text.replace('\n', '\\n')}'`
        );
    }

    console.log("");
}

function collectComments(lexer) {
    const comments = [];
    for (
        let token = lexer.nextToken();
        token.type != GameMakerLanguageLexer.EOF;
        token = lexer.nextToken()
    ) {
        if (token.type == GameMakerLanguageLexer.SingleLineComment) {
            comments.push({
                type: "CommentLine",
                value: token.text.replace(/^[\/][\/]/, ''),
                start: token.start,
                end: token.stop
            });
        }
        if (token.type == GameMakerLanguageLexer.MultiLineComment) {
            comments.push({
                type: "CommentBlock",
                value: token.text.replace(/^[\/][\*]/, '').replace(/[\*][\/]$/, ''),
                start: token.start,
                end: token.stop
            });
        }
    }
    return comments;
}

class GMLVisitor extends GameMakerLanguageParserVisitor {
    constructor(comments = [], getLocationInformation = true) {
        super();
        this.commentList = comments;
        this.getLocationInformation = getLocationInformation;
    }

    astNode(ctx, object) {
        if (this.getLocationInformation) {
            object.start = ctx.start.start;
            object.end = ctx.stop.stop;
        }
        return object
    }

    // Visit a parse tree produced by GameMakerLanguageParser#program.
    visitProgram(ctx) {
        let body = [];
        if (ctx.statementList() != null) {
            body = this.visit(ctx.statementList());
        }
        return this.astNode(ctx, {
            type: "Program",
            body: body,
            comments: this.commentList,
        });
    }

    // Visit a parse tree produced by GameMakerLanguageParser#statementList.
    visitStatementList(ctx) {
        let statements = ctx.statement();
        let list = []
        for (let i = 0; i < statements.length; i++) {
            let stmtObject = this.visit(statements[i]);
            if (stmtObject == null) { continue; }
            list.push(stmtObject);
        }
        return list;
    }

    // Visit a parse tree produced by GameMakerLanguageParser#statement.
    visitStatement(ctx) {
        if (ctx.block() != null) {
            return this.visit(ctx.block());
        }
        if (ctx.ifStatement() != null) {
            return this.visit(ctx.ifStatement());
        }
        if (ctx.variableDeclarationList() != null) {
            return this.visit(ctx.variableDeclarationList());
        }
        if (ctx.assignmentExpression() != null) {
            return this.visit(ctx.assignmentExpression());
        }
        if (ctx.callStatement() != null) {
            return this.visit(ctx.callStatement());
        }
        if (ctx.iterationStatement() != null) {
            return this.visit(ctx.iterationStatement());
        }
        if (ctx.functionDeclaration() != null) {
            return this.visit(ctx.functionDeclaration());
        }
        if (ctx.switchStatement() != null) {
            return this.visit(ctx.switchStatement());
        }
        if (ctx.constructorDeclaration() != null) {
            return this.visit(ctx.constructorDeclaration());
        }

        if (ctx.incDecStatement() != null) {
            return this.visit(ctx.incDecStatement());
        }
        if (ctx.returnStatement() != null) {
            return this.visit(ctx.returnStatement());
        }
        if (ctx.exitStatement() != null) {
            return this.visit(ctx.exitStatement());
        }
        if (ctx.withStatement() != null) {
            return this.visit(ctx.withStatement());
        }
        if (ctx.continueStatement() != null) {
            return this.visit(ctx.continueStatement());
        }
        if (ctx.breakStatement() != null) {
            return this.visit(ctx.breakStatement());
        }
        if (ctx.throwStatement() != null) {
            return this.visit(ctx.throwStatement());
        }
        if (ctx.tryStatement() != null) {
            return this.visit(ctx.tryStatement());
        }

        if (ctx.globalVarStatement() != null) {
            return this.visit(ctx.globalVarStatement());
        }
        if (ctx.macroStatement() != null) {
            return this.visit(ctx.macroStatement());
        }
        if (ctx.defineStatement() != null) {
            return this.visit(ctx.defineStatement());
        }
        if (ctx.regionStatement() != null) {
            return this.visit(ctx.regionStatement());
        }

        if (ctx.identifierStatement() != null) {
            return this.visit(ctx.identifierStatement());
        }
        return null;
    }


    // Visit a parse tree produced by GameMakerLanguageParser#block.
    visitBlock(ctx) {
        if (!ctx.statementList()) {
            return this.astNode(ctx, { type: "BlockStatement", body: [] });
        }
        return this.astNode(ctx, {
            type: "BlockStatement",
            body: this.visit(ctx.statementList())
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#ifStatement.
    visitIfStatement(ctx) {
        let test = this.visit(ctx.expression());
        let consequent = this.visit(ctx.statement()[0]);
        let alternate = null;

        if (ctx.statement()[1] != null) {
            alternate = this.visit(ctx.statement()[1]);
        }
        return this.astNode(ctx, {
            type: "IfStatement",
            test: test,
            consequent: consequent,
            alternate: alternate
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#DoStatement.
    visitDoStatement(ctx) {
        return this.astNode(ctx, {
            type: "DoUntilStatement",
            body: this.visit(ctx.statement()),
            test: this.visit(ctx.expression())
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#WhileStatement.
    visitWhileStatement(ctx) {
        return this.astNode(ctx, {
            type: "WhileStatement",
            test: this.visit(ctx.expression()),
            body: this.visit(ctx.statement())
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#ForStatement.
    visitForStatement(ctx) {
        let init = null;
        let test = null;
        let update = null;
        let body = null;

        if (ctx.variableDeclarationList() != null) {
            init = this.visit(ctx.variableDeclarationList());
        } else if (ctx.assignmentExpression() != null) {
            init = this.visit(ctx.assignmentExpression());
        }
        if (ctx.expression() != null) {
            test = this.visit(ctx.expression());
        }
        if (ctx.statement().length > 1) {
            update = this.visit(ctx.statement()[0]);
            body = this.visit(ctx.statement()[1]);
        } else {
            body = this.visit(ctx.statement()[0]);
        }

        return this.astNode(ctx, {
            type: "ForStatement",
            init: init,
            test: test,
            update: update,
            body: body
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#RepeatStatement.
    visitRepeatStatement(ctx) {
        return this.astNode(ctx, {
            type: "RepeatStatement",
            test: this.visit(ctx.expression()),
            body: this.visit(ctx.statement())
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#withStatement.
    visitWithStatement(ctx) {
        return this.astNode(ctx, {
            type: "WithStatement",
            object: this.visit(ctx.expression()),
            body: this.visit(ctx.statement())
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#switchStatement.
    visitSwitchStatement(ctx) {
        return this.astNode(ctx, {
            type: "SwitchStatement",
            discriminant: this.visit(ctx.expression()),
            cases: this.visit(ctx.caseBlock())
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#continueStatement.
    visitContinueStatement(ctx) {
        return this.astNode(ctx, {
            type: "ContinueStatement"
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#breakStatement.
    visitBreakStatement(ctx) {
        return this.astNode(ctx, {
            type: "BreakStatement"
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#exitStatement.
    visitExitStatement(ctx) {
        return this.astNode(ctx, {
            type: "ExitStatement"
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#emptyStatement.
    visitEmptyStatement(ctx) {
        return this.visitChildren(ctx);
    }


    // Visit a parse tree produced by GameMakerLanguageParser#caseBlock.
    visitCaseBlock(ctx) {
        let caseClauses = []
        // yucky
        if (ctx.caseClauses() != null) {
            let cases = ctx.caseClauses();
            for (let i = 0; i < cases.length; i++) {
                caseClauses = caseClauses.concat(this.visit(cases[i]));
            }
        }
        if (ctx.defaultClause() != null) {
            caseClauses.push(this.visit(ctx.defaultClause()));
        }
        return caseClauses;
    }


    // Visit a parse tree produced by GameMakerLanguageParser#caseClauses.
    visitCaseClauses(ctx) {
        return this.visitChildren(ctx);
    }


    // Visit a parse tree produced by GameMakerLanguageParser#caseClause.
    visitCaseClause(ctx) {
        let consequent = null;
        if (ctx.statementList() != null) {
            consequent = this.visit(ctx.statementList());
        }
        return this.astNode(ctx, {
            type: "SwitchCase",
            test: this.visit(ctx.expression()),
            consequent: consequent
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#defaultClause.
    visitDefaultClause(ctx) {
        let consequent = null;
        if (ctx.statementList() != null) {
            consequent = this.visit(ctx.statementList());
        }
        return this.astNode(ctx, {
            type: "SwitchCase",
            test: null,
            consequent: consequent
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#throwStatement.
    visitThrowStatement(ctx) {
        return this.astNode(ctx, {
            type: "ThrowStatement",
            argument: this.visit(ctx.expression())
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#tryStatement.
    visitTryStatement(ctx) {
        let handler = null;
        let finalizer = null;
        if (ctx.catchProduction() != null) {
            handler = this.visit(ctx.catchProduction());
        }
        if (ctx.finallyProduction() != null) {
            finalizer = this.visit(ctx.finallyProduction());
        }
        return this.astNode(ctx, {
            type: "TryStatement",
            block: this.visit(ctx.statement()),
            handler: handler,
            finalizer: finalizer
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#catchProduction.
    visitCatchProduction(ctx) {
        let param = null;
        if (ctx.identifier() != null) {
            param = this.visit(ctx.identifier());
        }
        return this.astNode(ctx, {
            type: "CatchClause",
            param: param,
            body: this.visit(ctx.statement())
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#finallyProduction.
    visitFinallyProduction(ctx) {
        return this.astNode(ctx, {
            type: "Finalizer",
            body: this.visit(ctx.statement())
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#returnStatement.
    visitReturnStatement(ctx) {
        let arg = null;
        if (ctx.expression() != null) {
            arg = this.visit(ctx.expression());
        }
        return this.astNode(ctx, {
            type: "ReturnStatement",
            argument: arg
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#deleteStatement.
    visitDeleteStatement(ctx) {
        return this.astNode(ctx, {
            type: "DeleteStatement",
            operator: "delete",
            prefix: true,
            argument: this.visit(ctx.expression()),
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#assignmentExpression.
    visitAssignmentExpression(ctx) {
        return this.astNode(ctx, {
            type: "AssignmentExpression",
            operator: this.visit(ctx.assignmentOperator()),
            left: this.visit(ctx.lValueExpression()),
            right: this.visit(ctx.expression())
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#variableDeclarationList.
    visitVariableDeclarationList(ctx) {
        return this.astNode(ctx, {
            type: "VariableDeclaration",
            declarations: this.visit(ctx.variableDeclaration()),
            kind: this.visit(ctx.varModifier())
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#varModifier.
    visitVarModifier(ctx) {
        if (ctx.Var() != null) {
            return "var";
        } else if (ctx.Static() != null) {
            return "static";
        }
    }


    // Visit a parse tree produced by GameMakerLanguageParser#variableDeclaration.
    visitVariableDeclaration(ctx) {
        let initExpr = null;
        if (ctx.expression()) {
            initExpr = this.visit(ctx.expression())
        }
        return this.astNode(ctx, {
            type: "VariableDeclarator",
            id: this.visit(ctx.identifier()),
            init: initExpr
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#globalVarStatement.
    visitGlobalVarStatement(ctx) {
        return this.astNode(ctx, {
            type: "GlobalVarStatement",
            declarations: this.visit(ctx.identifier())
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#MemberDotLValue.
    visitMemberDotLValue(ctx) {
        return this.astNode(ctx, {
            type: "MemberDotExpression",
            object: this.visit(ctx.lValueExpression()),
            property: this.visit(ctx.identifier())
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#ParenthesizedLValue.
    visitParenthesizedLValue(ctx) {
        return this.visit(ctx.lValueExpression());
    }


    // Visit a parse tree produced by GameMakerLanguageParser#IdentifierLValue.
    visitIdentifierLValue(ctx) {
        return this.visit(ctx.identifier());
    }


    // Visit a parse tree produced by GameMakerLanguageParser#MemberIndexLValue.
    visitMemberIndexLValue(ctx) {
        let qualifier = null;
        if (ctx.accessorQualifier() != null) {
            qualifier = this.visit(ctx.accessorQualifier());
        }
        return this.astNode(ctx, {
            type: "MemberIndexExpression",
            object: this.visit(ctx.lValueExpression()),
            property: this.visit(ctx.expressionSequence()),
            qualifier: qualifier
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#expressionSequence.
    visitExpressionSequence(ctx) {
        let expressions = ctx.expression();
        if (expressions.length == 1) {
            return this.visit(expressions[0]);
        } else {
            return this.visit(expressions);
        }
    }


    // Visit a parse tree produced by GameMakerLanguageParser#TernaryExpression.
    visitTernaryExpression(ctx) {
        return this.astNode(ctx, {
            type: "ConditionalExpression",
            test: this.visit(ctx.expression()[0]),
            consequent: this.visit(ctx.expression()[1]),
            alternate: this.visit(ctx.expression()[2]),
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#LogicalAndExpression.
    visitLogicalAndExpression(ctx) {
        return this.astNode(ctx, {
            type: "BinaryExpression",
            operator: "&&",
            left: this.visit(ctx.expression()[0]),
            right: this.visit(ctx.expression()[1])
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#LogicalOrExpression.
    visitLogicalOrExpression(ctx) {
        return this.astNode(ctx, {
            type: "BinaryExpression",
            operator: "||",
            left: this.visit(ctx.expression()[0]),
            right: this.visit(ctx.expression()[1])
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#NotExpression.
    visitNotExpression(ctx) {
        return this.astNode(ctx, {
            type: "UnaryExpression",
            operator: "!",
            prefix: true,
            argument: this.visit(ctx.expression()),
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#UnaryMinusExpression.
    visitUnaryMinusExpression(ctx) {
        return this.astNode(ctx, {
            type: "UnaryExpression",
            operator: "-",
            prefix: true,
            argument: this.visit(ctx.expression()),
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#EqualityExpression.
    visitEqualityExpression(ctx) {
        return this.astNode(ctx, {
            type: "BinaryExpression",
            operator: "==",
            left: this.visit(ctx.expression()[0]),
            right: this.visit(ctx.expression()[1])
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#BitXOrExpression.
    visitBitXOrExpression(ctx) {
        return this.astNode(ctx, {
            type: "BinaryExpression",
            operator: "^",
            left: this.visit(ctx.expression()[0]),
            right: this.visit(ctx.expression()[1])
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#MultiplicativeExpression.
    visitMultiplicativeExpression(ctx) {
        let operator = null;
        if (ctx.Multiply() != null) {
            operator = ctx.Multiply().getText();
        }
        if (ctx.Divide() != null) {
            operator = ctx.Divide().getText();
        }
        if (ctx.Modulo() != null) {
            operator = ctx.Modulo().getText();
        }
        if (ctx.IntegerDivide() != null) {
            operator = ctx.IntegerDivide().getText();
        }
        return this.astNode(ctx, {
            type: "BinaryExpression",
            operator: operator,
            left: this.visit(ctx.expression()[0]),
            right: this.visit(ctx.expression()[1])
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#CallExpression.
    visitCallExpression(ctx) {
        let callee = this.visit(ctx.expression());
        return this.astNode(ctx, {
            type: "CallExpression",
            callee: callee,
            arguments: this.visit(ctx.arguments())
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#BitShiftExpression.
    visitBitShiftExpression(ctx) {
        let operator = null;
        if (ctx.RightShiftArithmetic() != null) {
            operator = ctx.RightShiftArithmetic().getText();
        }
        if (ctx.LeftShiftArithmetic() != null) {
            operator = ctx.LeftShiftArithmetic().getText();
        }
        return this.astNode(ctx, {
            type: "BinaryExpression",
            operator: operator,
            left: this.visit(ctx.expression()[0]),
            right: this.visit(ctx.expression()[1])
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#ParenthesizedExpression.
    visitParenthesizedExpression(ctx) {
        return this.visit(ctx.expression());
    }


    // Visit a parse tree produced by GameMakerLanguageParser#AdditiveExpression.
    visitAdditiveExpression(ctx) {
        let operator = null;
        if (ctx.Plus() != null) {
            operator = ctx.Plus().getText();
        }
        if (ctx.Minus() != null) {
            operator = ctx.Minus().getText();
        }
        return this.astNode(ctx, {
            type: "BinaryExpression",
            operator: operator,
            left: this.visit(ctx.expression()[0]),
            right: this.visit(ctx.expression()[1])
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#RelationalExpression.
    visitRelationalExpression(ctx) {
        let operator = null;
        if (ctx.LessThan() != null) {
            operator = ctx.LessThan().getText();
        }
        if (ctx.MoreThan() != null) {
            operator = ctx.MoreThan().getText();
        }
        if (ctx.LessThanEquals() != null) {
            operator = ctx.LessThanEquals().getText();
        }
        if (ctx.GreaterThanEquals() != null) {
            operator = ctx.GreaterThanEquals().getText();
        }
        return this.astNode(ctx, {
            type: "BinaryExpression",
            operator: operator,
            left: this.visit(ctx.expression()[0]),
            right: this.visit(ctx.expression()[1])
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#PostIncrementExpression.
    visitPostIncDecExpression(ctx) {
        let operator = null;
        if (ctx.PlusPlus() != null) {operator = ctx.PlusPlus().getText();}
        if (ctx.MinusMinus() != null) {operator = ctx.MinusMinus().getText();}
        return this.astNode(ctx, {
            type: "UnaryExpression",
            operator: operator,
            prefix: false,
            argument: this.visit(ctx.lValueExpression()),
        });
    }

    // Visit a parse tree produced by GameMakerLanguageParser#PostIncrementExpression.
    visitPreIncDecExpression(ctx) {
        let operator = null;
        if (ctx.PlusPlus() != null) {operator = ctx.PlusPlus().getText();}
        if (ctx.MinusMinus() != null) {operator = ctx.MinusMinus().getText();}
        return this.astNode(ctx, {
            type: "UnaryExpression",
            operator: operator,
            prefix: true,
            argument: this.visit(ctx.lValueExpression()),
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#BitNotExpression.
    visitBitNotExpression(ctx) {
        return this.astNode(ctx, {
            type: "UnaryExpression",
            operator: "~",
            prefix: true,
            argument: this.visit(ctx.expression()),
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#NewExpression.
    visitNewExpression(ctx) {
        return this.astNode(ctx, {
            type: "NewExpression",
            expression: this.visit(ctx.identifier()),
            arguments: this.visit(ctx.arguments())
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#LiteralExpression.
    visitLiteralExpression(ctx) {
        return this.visitChildren(ctx)[0];
    }


    // Visit a parse tree produced by GameMakerLanguageParser#MemberDotExpression.
    visitMemberDotExpression(ctx) {
        return this.astNode(ctx, {
            type: "MemberDotExpression",
            object: this.visit(ctx.expression()[0]),
            property: this.visit(ctx.expression()[1])
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#MemberIndexExpression.
    visitMemberIndexExpression(ctx) {
        let qualifier = null;
        if (ctx.accessorQualifier() != null) {
            qualifier = this.visit(ctx.accessorQualifier());
        }
        return this.astNode(ctx, {
            type: "MemberIndexExpression",
            object: this.visit(ctx.expression()),
            property: this.visit(ctx.expressionSequence()),
            qualifier: qualifier
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#IdentifierExpression.
    visitIdentifierExpression(ctx) {
        return this.visitChildren(ctx)[0];
    }


    // Visit a parse tree produced by GameMakerLanguageParser#BitAndExpression.
    visitBitAndExpression(ctx) {
        return this.astNode(ctx, {
            type: "BinaryExpression",
            operator: "&",
            left: this.visit(ctx.expression()[0]),
            right: this.visit(ctx.expression()[1])
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#LogicalXorExpression.
    visitLogicalXorExpression(ctx) {
        return this.astNode(ctx, {
            type: "BinaryExpression",
            operator: "^^",
            left: this.visit(ctx.expression()[0]),
            right: this.visit(ctx.expression()[1])
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#BitOrExpression.
    visitBitOrExpression(ctx) {
        return this.astNode(ctx, {
            type: "BinaryExpression",
            operator: "|",
            left: this.visit(ctx.expression()[0]),
            right: this.visit(ctx.expression()[1])
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#CoalesceExpression.
    visitCoalesceExpression(ctx) {
        return this.astNode(ctx, {
            type: "BinaryExpression",
            operator: "??",
            left: this.visit(ctx.expression()[0]),
            right: this.visit(ctx.expression()[1])
        });
    }

    // Visit a parse tree produced by GameMakerLanguageParser#callStatement.
    visitCallStatement(ctx) {
        let callee = this.visit(ctx.expression());
        return this.astNode(ctx, {
            type: "CallStatement",
            callee: callee,
            arguments: this.visit(ctx.arguments())
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#PostIncrementStatement.
    visitPostIncrementStatement(ctx) {
        return this.astNode(ctx, {
            type: "IncDecStatement",
            operator: "++",
            prefix: false,
            argument: this.visit(ctx.lValueExpression()),
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#PostDecreaseStatement.
    visitPostDecreaseStatement(ctx) {
        return this.astNode(ctx, {
            type: "IncDecStatement",
            operator: "--",
            prefix: false,
            argument: this.visit(ctx.lValueExpression()),
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#PreIncrementStatement.
    visitPreIncrementStatement(ctx) {
        return this.astNode(ctx, {
            type: "IncDecStatement",
            operator: "++",
            prefix: true,
            argument: this.visit(ctx.lValueExpression()),
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#PreDecreaseStatement.
    visitPreDecreaseStatement(ctx) {
        return this.astNode(ctx, {
            type: "IncDecStatement",
            operator: "--",
            prefix: true,
            argument: this.visit(ctx.lValueExpression()),
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#accessorQualifier.
    visitAccessorQualifier(ctx) {
        return ctx.getText();
    }


    // Visit a parse tree produced by GameMakerLanguageParser#arguments.
    visitArguments(ctx) {
        let args = ctx.argument();
        let argList = []
        for (let i = 0; i < args.length; i++) {
            argList.push(this.visit(args[i]));
        }
        return argList;
    }


    // Visit a parse tree produced by GameMakerLanguageParser#argument.
    visitArgument(ctx) {
        return this.visit(ctx.expression());
    }


    // Visit a parse tree produced by GameMakerLanguageParser#assignmentOperator.
    visitAssignmentOperator(ctx) {
        let text = ctx.getText();
        if (text == ':=') { 
            text = '='; 
        }
        return text;
    }


    // Visit a parse tree produced by GameMakerLanguageParser#literal.
    visitLiteral(ctx) {
        if (ctx.arrayLiteral() != null) {
            return this.visit(ctx.arrayLiteral());
        }
        if (ctx.structLiteral() != null) {
            return this.visit(ctx.structLiteral());
        }
        if (ctx.templateStringLiteral() != null) {
            return this.visit(ctx.templateStringLiteral());
        }

        let value = ctx.getText();

        let text = ctx.getText();
        let asInt = parseInt(text);
        let asFloat = parseFloat(text);

        if (!isNaN(asInt)) {
            value = asInt;
        }
        if (!isNaN(asFloat)) {
            value = asFloat;
        }
        if (text == "true" || text == "false") {
            value = (text == "true");
        }

        return this.astNode(ctx, {
            type: "Literal",
            value: value
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#templateStringLiteral.
    visitTemplateStringLiteral(ctx) {
        let atoms = [];
        let atomList = [];
        if (ctx.templateStringAtom() != null) {
            atoms = ctx.templateStringAtom();
        }
        for (let i = 0; i < atoms.length; i++) {
            let atom = atoms[i];
            if (atom.expression() != null) {
                atomList.push(this.visit(atom.expression()));
            }
            if (atom.TemplateStringText() != null) {
                atomList.push({
                    type: "TemplateStringText",
                    value: atom.TemplateStringText().getText()
                });
            }
        }
        return this.astNode(ctx, {
            type: "TemplateStringExpression",
            atoms: atomList
        });
    }

    // Visit a parse tree produced by GameMakerLanguageParser#templateStringAtom.
    visitTemplateStringAtom(ctx) {
        this.visitChildren(ctx);
    }


    // Visit a parse tree produced by GameMakerLanguageParser#arrayLiteral.
    visitArrayLiteral(ctx) {
        return this.astNode(ctx, {
            type: "ArrayExpression",
            elements: this.visit(ctx.elementList())
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#elementList.
    visitElementList(ctx) {
        if (ctx.expression() == null) {
            return [];
        }
        return this.visit(ctx.expression());
    }


    // Visit a parse tree produced by GameMakerLanguageParser#structLiteral.
    visitStructLiteral(ctx) {
        let properties = [];
        if (ctx.propertyAssignment() == null) {
            properties = this.visit(ctx.propertyAssignment());
        }
        return this.astNode(ctx, {
            type: "StructExpression",
            properties: properties
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#constructorDeclaration.
    visitConstructorDeclaration(ctx) {
        let id = null;
        let parent = null;

        if (ctx.identifier()[0] != null) {
            id = this.visit(ctx.identifier()[0]);
        }
        if (ctx.identifier()[1] != null) {
            parent = {
                id: this.visit(ctx.identifier()[1]),
                params: this.visit(ctx.parameterList()[1])
            };
        }
        return this.astNode(ctx, {
            type: "ConstructorDeclaration",
            id: id,
            params: this.visit(ctx.parameterList()[0]),
            parent: parent,
            body: this.visit(ctx.statement())
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#functionDeclaration.
    visitFunctionDeclaration(ctx) {
        return this.astNode(ctx, {
            type: "FunctionDeclaration",
            id: this.visit(ctx.identifier()),
            params: this.visit(ctx.parameterList()),
            body: this.visit(ctx.statement())
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#FunctionExpression.
    visitFunctionExpression(ctx) {
        return this.astNode(ctx, {
            type: "FunctionExpression",
            params: this.visit(ctx.parameterList()),
            body: this.visit(ctx.statement())
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#parameterList.
    visitParameterList(ctx) {
        let params = ctx.parameterArgument();
        let paramList = []
        for (let i = 0; i < params.length; i++) {
            paramList.push(this.visit(params[i]));
        }
        return paramList;
    }


    // Visit a parse tree produced by GameMakerLanguageParser#parameterArgument.
    visitParameterArgument(ctx) {
        if (ctx.expression() != null) {
            return this.astNode(ctx, {
                type: "DefaultParameter",
                left: this.visit(ctx.identifier()),
                right: this.visit(ctx.expression())
            });
        } else {
            return this.visit(ctx.identifier());
        }
    }


    // Visit a parse tree produced by GameMakerLanguageParser#propertyAssignment.
    visitPropertyAssignment(ctx) {
        return this.astNode(ctx, {
            type: "Property",
            name: this.visit(ctx.expression()),
            value: this.visit(ctx.propertyIdentifier())
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#propertyIdentifier.
    visitPropertyIdentifier(ctx) {
        return this.visitChildren(ctx);
    }


    // Visit a parse tree produced by GameMakerLanguageParser#identifier.
    visitIdentifier(ctx) {
        let name = ""
        if (ctx.Identifier() != null) {
            name = ctx.Identifier().getText();
        } else {
            name = this.visit(ctx.softKeyword());
        }
        return this.astNode(ctx, {
            type: "Identifier", name: name 
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#enumeratorDeclaration.
    visitEnumeratorDeclaration(ctx) {
        return this.visitChildren(ctx);
    }


    // Visit a parse tree produced by GameMakerLanguageParser#enumeratorList.
    visitEnumeratorList(ctx) {
        return this.visitChildren(ctx);
    }


    // Visit a parse tree produced by GameMakerLanguageParser#enumerator.
    visitEnumerator(ctx) {
        return this.visitChildren(ctx);
    }


    // Visit a parse tree produced by GameMakerLanguageParser#macroStatement.
    visitMacroStatement(ctx) {
        return this.astNode(ctx, {
            type: "MacroDeclaration",
            name: this.visit(ctx.identifier()),
            tokens: this.visit(ctx.macroToken())
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#macroStatement.
    visitMacroToken(ctx) {
        if (ctx.EscapedNewLine() != null) {
            return "\n";
        }
        return ctx.getText();
    }



    // Visit a parse tree produced by GameMakerLanguageParser#defineStatement.
    visitDefineStatement(ctx) {
        return this.astNode(ctx, {
            type: "DefineStatement",
            name: ctx.RegionCharacters().getText()
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#regionStatement.
    visitRegionStatement(ctx) {
        let name = null;
        if (ctx.RegionCharacters() != null) {
            name = ctx.RegionCharacters().getText();
        }
        if (ctx.Region() != null) {
            return this.astNode(ctx, {
                type: "RegionStatement",
                name: name
            });
        } else {
            return this.astNode(ctx, {
                type: "EndRegionStatement",
                name: name
            });
        }
    }


    // Visit a parse tree produced by GameMakerLanguageParser#identifierStatement.
    visitIdentifierStatement(ctx) {
        return this.astNode(ctx, {
            type: "IdentifierStatement",
            name: this.visit(ctx.identifier())
        });
    }


    // Visit a parse tree produced by GameMakerLanguageParser#keyword.
    visitKeyword(ctx) {
        return this.visitChildren(ctx);
    }


    // Visit a parse tree produced by GameMakerLanguageParser#softKeyword.
    visitSoftKeyword(ctx) {
        if (ctx.Constructor() != null) {
            return ctx.Constructor().getText();
        }
        return null;
    }


    // Visit a parse tree produced by GameMakerLanguageParser#propertySoftKeyword.
    visitPropertySoftKeyword(ctx) {
        if (ctx.NoOneLiteral() != null) {
            return ctx.NoOneLiteral().getText();
        }
    }


    // Visit a parse tree produced by GameMakerLanguageParser#openBlock.
    visitOpenBlock(ctx) {
        return this.visitChildren(ctx);
    }


    // Visit a parse tree produced by GameMakerLanguageParser#closeBlock.
    visitCloseBlock(ctx) {
        return this.visitChildren(ctx);
    }


    // Visit a parse tree produced by GameMakerLanguageParser#eos.
    visitEos(ctx) {
        return this.visitChildren(ctx);
    }
}

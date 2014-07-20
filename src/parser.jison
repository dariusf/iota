
/* A parser definition for Io. */

/* Lexical grammar */

%lex
%x DoubleQuotedString
%x QuotedStringEscape
%%

[ \t]+                                  {} /* whitespace */
(\#|\/\/)[^\r\n]*                       {} /* single-line comments */
\/\*([\u0000-\uffff]*?)\*\/             {} /* multiline comments */

\b[0-9]+("."[0-9]+)?\b                  return 'NUMBER'
[^()\[\]{}",;\s]+                       return 'IDENTIFIER'
"("                                     return '('
")"                                     return ')'
\r?\n                                   return 'NEWLINE'
";"                                     return ';'
","                                     return ','

'""'                                    return 'EmptyString'
'"'                                     this.begin('DoubleQuotedString');
<DoubleQuotedString>\\                  this.begin('QuotedStringEscape');
<DoubleQuotedString>'"'                 this.popState();
<QuotedStringEscape>(.|\r\n|\n)         { /* The newlines are there because we can span strings across lines using \ */
                                            this.popState();
                                            return 'QuotedStringEscape';
                                        }
<DoubleQuotedString>[^"\\]*             return 'QuotedString';

<<EOF>>                                 return 'EOF'
.                                       return 'INVALID'

/lex

%{
    // This is done in place of setting yy because the latter wouldn't work.
    var ioAST = require('./ast');
%}

%start program

%%

program
    : looselyTerminatedExpr EOF
        {return $1;}
    | EOF
        {return [];}
    ;

looselyTerminatedExpr
    : zeroOrMoreTerminators exprs zeroOrMoreTerminators
        {$$ = $2;}
    ;

exprs
    : exprs oneOrMoreTerminators expr
        {$1.push($3); $$ = $1;}
    | expr
        {$$ = [$1];}
    ;

expr
    : expr message
        {$1.getMessages().push(new ioAST.Message($2)); $$ = $1;}
    | message
        {$$ = new ioAST.Chain([new ioAST.Message($1)]);}
    | '(' expr ')'
        {$$ = $2;}
    ;

message
    : symbol
        {
            $$ = new ioAST.Symbol($1, []);
        }
    | symbol arguments
        {
            $$ = new ioAST.Symbol($1, $2);
        }
    ;

oneOrMoreTerminators
    : NEWLINE oneOrMoreTerminators
    | NEWLINE
    | ';' oneOrMoreTerminators
    | ';'
    ;

zeroOrMoreTerminators
    : oneOrMoreTerminators
    |
    ;

arguments
    : '(' ')'
        {$$ = [];}
    | '(' argumentList ')'
        {$$ = $2;}
    ;

argumentList
    : looselyTerminatedExpr
        {$$ = [$1];}
    | argumentList ',' looselyTerminatedExpr
        {$1.push($3); $$ = $1; }
    ;

symbol
    : IDENTIFIER
        {$$ = new ioAST.Literal('identifier', $1);}
    | NUMBER
        {$$ = new ioAST.Literal('number', $1);}
    | string
        {$$ = new ioAST.Literal('string', $1);}
    ;

string
    :
      'EmptyString'
    {
        $$ = '';
    }
    | 'QuotedString'
    | 'QuotedStringEscape'
    {
        switch (yytext)
        {
            case 'b':       $$ = '\b'; break;
            case 'n':       $$ = '\n'; break;
            case 'r':       $$ = '\r'; break;
            case 't':       $$ = '\t'; break;
            case "'":       $$ = "'"; break;
            case '"':       $$ = '"'; break;
            case '\\':      $$ = '\\'; break;
            case '\n':
            case '\r\n':    $$ = ''; break;
            default:        $$ = '\\' + $1; break;
        }
    }
    | 'QuotedStringEscape' quotedstring
    {
        switch ($1)
        {
            case 'b':       $$ = '\b'; break;
            case 'n':       $$ = '\n'; break;
            case 'r':       $$ = '\r'; break;
            case 't':       $$ = '\t'; break;
            case "'":       $$ = "'"; break;
            case '"':       $$ = '"'; break;
            case '\\':      $$ = '\\'; break;
            case '\n':
            case '\r\n':    $$ = ''; break;
            default:        $$ = '\\' + $1; break;
        }
        $$ += $2;
    }
    | 'QuotedString' quotedstring
    {
        $$ = $1 + $2;
    }
    ;

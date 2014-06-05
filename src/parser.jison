/* description: Parses end executes Io programs. */

/* lexical grammar */
%lex
%x DoubleQuotedString
%x QuotedStringEscape
%%

[ \t]+                      /* whitespace */
\b[0-9]+("."[0-9]+)?\b  return 'NUMBER'
[^()\[\]{}",;\s]+       return 'IDENTIFIER'
"("                     return '('
")"                     return ')'
\r?\n                   return 'NEWLINE'
";"                     return ';'
","                     return ','

'""'                                          return 'EmptyString'
'"'                                           this.begin('DoubleQuotedString');
<DoubleQuotedString>\\                        this.begin('QuotedStringEscape');
<DoubleQuotedString>'"'                       this.popState();
<QuotedStringEscape>(.|\r\n|\n)               { this.popState(); return 'QuotedStringEscape'; } /* The newlines are there because we can span strings across lines using \ */
<DoubleQuotedString>[^"\\]*                   return 'QuotedString';

<<EOF>>                 return 'EOF'
.                       return 'INVALID'

/*
"*"                     return '*'
"/"                     return '/'
"-"                     return '-'
"+"                     return '+'
"^"                     return '^'
"PI"                    return 'PI'
"E"                     return 'E'
*/

/lex

/* operator associations and precedence */

/*
%left '+' '-'
%left '*' '/'
%left '^'
%left UMINUS
*/

%start program

%% /* language grammar */

    /*

        exp        ::= { message | terminator }
        message    ::= symbol [arguments]
        arguments  ::= "(" [exp [ { "," exp } ]] ")"
        symbol     ::= identifier | number | string
        terminator ::= "\n" | ";"

    */

program
    : looselyTerminatedExpr EOF
        {return $1;}
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
        {$1.value.push({type: 'message', value: $2}); $$ = $1;}
    | message
        {$$ = {type: 'chain', value: [{type: 'message', value: $1}]};}
    | '(' expr ')'
        {$$ = $2;}
    ;

message
    : symbol
        {
            $$ = {
                type: 'symbol',
                value: $1,
                arguments: [],
                loc: {start: {line: @$.first_line, column: @$.first_column}, end: {line: @$.last_line, column: @$.last_column}}
            };
        }
    | symbol arguments
        {
            $$ = {
                type: 'symbol',
                value: $1,
                arguments: $2,
                loc: {start: {line: @$.first_line, column: @$.first_column}, end: {line: @$.last_line, column: @$.last_column}}
            };
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
        {$$ = {type: 'identifier', value: $1};}
    | NUMBER
        {$$ = {type: 'number', value: $1};}
    | string
        {$$ = {type: 'string', value: $1};}
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

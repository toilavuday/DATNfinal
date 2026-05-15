
import fs from 'fs';

const content = fs.readFileSync('d:\\DA\\CMS-release\\src\\app\\(dashbroad)\\home\\page.tsx', 'utf8');

function countBrackets(str) {
    let curly = 0;
    let square = 0;
    let round = 0;
    let angle = 0;
    
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '{') curly++;
        if (str[i] === '}') curly--;
        if (str[i] === '[') square++;
        if (str[i] === ']') square--;
        if (str[i] === '(') round++;
        if (str[i] === ')') round--;
        
        // Simple angle bracket check (might be tricky due to < and > in JS)
        // But in JSX, they should be somewhat balanced if not in strings.
    }
    
    return { curly, square, round };
}

console.log(countBrackets(content));


import minimist from 'minimist';


const args = minimist(process.argv.slice(2));
const mode = args.mode || 0;

console.log('++++ in bissetup, processed arguments, mode=',mode);

export function getServer() {

    if (mode===3)
        return "https://bioimagesuiteweb.github.io/webapp";

    if (mode===2)
        return "https://bioimagesuiteweb.github.io/unstableapp";

    if (mode===1)
        return "http://localhost:8080/build/web";
    
    return "http://localhost:8080/web";
}

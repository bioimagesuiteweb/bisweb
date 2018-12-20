
export function getServer(mode=0) {

    if (mode===2)
        return "https://bioimagesuiteweb.github.io/unstableapp";

    if (mode===1)
        return "http://localhost:8080/build/web";
    
    return "http://localhost:8080/web";
}

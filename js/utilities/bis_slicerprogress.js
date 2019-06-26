
module.exports = {

    status : 0,
    
    start : function(name='bisweb',comment='command line tool') {
        console.log("<filter-start>");
        console.log(`<filter-name>${name}</filter-name>`);
	console.log(`<filter-comment>${comment}</filter-comment>`);
	console.log(`</filter-start>`);
    },

    update : function(p) {
        console.log(`<filter-progress>${p}</filter-progress>`);
    },
    
    end : function(name='bisweb') {
        console.log("<filter-end>");
        console.log(`<filter-name>${name}</filter-name>`);
	console.log(`</filter-end>`);
    }
};

    
    

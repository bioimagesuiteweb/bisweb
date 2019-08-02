
module.exports = {

    enabled : false,
    name : 'bisweb',
    
    start : function(name='bisweb',comment='command line tool') {
        this.name=name;
        this.enabled=true;
        console.log("<filter-start>");
        console.log(`<filter-name>${this.name}</filter-name>`);
	console.log(`<filter-comment>${comment}</filter-comment>`);
	console.log(`</filter-start>`);
    },

    update : function(p) {
        if (!this.enabled)
            return;
        
        console.log(`<filter-progress>${p}</filter-progress>`);
    },

    updatePercentage : function (per) {

        if (!this.enabled)
            return;
    
        if (per<0.0)
            per=0.0;
        else if (per>100.0)
            per=100.0;
        let p=(per/100.0)*0.7+0.2;
        p=Math.round(p*1000)*0.001;
        this.update(p);
    },
    
    end : function() {
        if (!this.enabled)
            return;
        
        console.log("<filter-end>");
        console.log(`<filter-name>${this.name}</filter-name>`);
	console.log(`</filter-end>`);
    }
};

    
    

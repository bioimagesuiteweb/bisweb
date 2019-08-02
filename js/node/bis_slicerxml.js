const bisdate=require('biswasmdate.js');

module.exports={


    createOptionXML : function(param) {


        let lowval = param.lowval || param.low;
        let highval = param.highval || param.high;

        let base=`
\t\t\t<name>${param.name}</name>
\t\t\t<label>${param.name}</label>
\t\t\t<description>${param.description}</description>
\t\t\t<longflag>--${param.varname}</longflag>`;
        if (param.default !== undefined) 
            base+=`\n\t\t\t<default>${param.default}</default>\n`;
        else
            base+='\n';
        
        if (param.type === 'filename') {
            let tmp='';
            if (param.writefile)
                tmp="\t\t\t<channel>output</channel>\n";
            else
                tmp="\t\t\t<channel>input</channel>\n";
            if (param.gui === 'directory') {
                return `\t\t<directory>${base}    ${tmp}\t\t</directory>\n`;
            }
            return `\t\t<file>${base}    ${tmp}\t\t</file>\n`;
        } else if (param.type === 'image') {
            let tmp='';
            if (param.writefile)
                tmp="\t\t\t<channel>output</channel>\n";
            else
                tmp="\t\t\t<channel>input</channel>\n";
            return `\t\t<image fileExtensions=".nii.gz,.nii">${base}    ${tmp}\t\t</image>\n`;
        }
        
        let range='';
        if (lowval !== undefined && highval !==undefined) {
            range=`\t\t\t<constraints>\n\t\t\t\t<minimum>${lowval}</minimum>\n\t\t\t\t<maximum>${highval}</maximum>\n\t\t\t</constraints>\n`;
        }
        
        
        
        let fields=param.fields || [];
        let elrange="";
        if (param.type==='boolean') {
            fields=[ 'true', 'false' ];
        }

        if (fields.length>0) {
            for (let i=0;i<fields.length;i++) {
                elrange=elrange+`\t\t\t<element>${fields[i]}</element>\n`;
            }
        }
        if (elrange.length>0) {
            param.type='list';
            range=elrange;
        }

        let line='';
        if (param.type === 'int') {
            line=`\t\t<integer>${base}${range}\t\t</integer>\n`;
        } else if (param.type === 'float') {
            line=`\t\t<double>${base}${range}\t\t</double>\n`;
        } else if (param.type === 'boolean' || param.type==='list') {
            line=`\t\t<string-enumeration>${base}${elrange}\t\t</string-enumeration>\n`;
        } else {
            line =`\t\t<string>${base}${elrange}\t\t</string>\n`;
        }


        return line;
    },
    
    createXMLDescription : function(mod) {


        //let cmd=mod.name;
        let normal="\t<parameters>\n\t\t<label>Standard</label>\n\t\t<description>Standard Parameters</description>\n";
        let advanced="\t<parameters advanced=\"true\">\n\t\t<label>Advanced</label>\n\t\t<description>Advanced Parameters</description>\n";
        let inp="\t<parameters>\n\t\t<label>Inputs</label>\n\t\t<description>Input Objects</description>\n";
        let outp="\t<parameters>\n\t\t<label>Outputs</label>\n\t\t<description>Output Objects</description>\n";
        let numnormal=0;
        let numadvanced=0;
        let numinp=0;
        let numout=0;

        
        let desc=mod.getDescription();

        desc.params.push( {
            "name": "SlicerProgress",
            "description": "Enables progress xml outputs for Slicer",
            "priority": 10000,
            "advanced": true,
            "gui": "check",
            "varname": "slicerprogress",
            "type": 'boolean',
            "default": true,
        });

        
        for (let i=0;i<desc.params.length;i++) {
            let m=this.createOptionXML(desc.params[i]);
            if (desc.params[i].advanced) {
                ++numadvanced;
                advanced=advanced+m;
            } else {
                ++numnormal;
                normal=normal+m;
            }
        }

        let obj=[ desc.inputs, desc.outputs ];
        for (let pass=0;pass<=1;pass++) {
            
            for (let i=0;i<obj[pass].length;i++) {
                let ob=obj[pass][i];
                if (ob.type!=='image') {
                    ob.type='filename';
                }
                ob.writefile=(pass===1);
                let m=this.createOptionXML(ob);
                if (pass===0) {
                    inp+=m;
                    numinp+=1;
                } else {
                    outp+=m;
                    numout+=1;
                }
            }
        }

        let cmdline="<?xml version=\"1.0\" encoding=\"utf-8\"?>";
        cmdline+="\n<executable>";
        cmdline+="\n\t<category>BisWEB</category>";
        cmdline+=`\n\t<title>${desc.name}</title>`;
        cmdline+= `\n\t<description>${desc.description}</description>`;
        cmdline+=`\n\t<version>${bisdate.version}</version>`;
        cmdline+="\n\t<documentation-url>https://bioimagesuiteweb.github.io/bisweb-manual</documentation-url>";
        cmdline+="\n\t<license>GPL v2</license>";
        cmdline+=`\n\t<contributor>${desc.author}</contributor>\n`;
        cmdline+='\n<acknowledgements>Funding for this work was provided by the NIH Brain Initiative under grant R24 MH114805.</acknowledgements>\n';
        
        
        if (numnormal > 0)
            cmdline+=normal+'\t</parameters>\n';
        if (numadvanced > 0)
            cmdline+=advanced+'\t</parameters>\n';
        if (numinp > 0 )
            cmdline+=inp+'\t</parameters>\n';
        if (numout > 0 )
            cmdline+=outp+'\t</parameters>\n';

        cmdline+='\n</executable>\n';

        return cmdline;
    },
};

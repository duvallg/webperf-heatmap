const path = require('path');
const fs = require('fs-extra');
const webpagetest = require('webpagetest');
const heatmap = require('./heatmap');
const admzip = require('adm-zip');

const defaultServer = 'www.webpagetest.org';
const wptAPIkey = '6d00ee2d01d64f87890cb0f5d724d0f6';

/* For submitting tests:
 * set screenshot size to full (probably new code in WPT-api)
 * set image quality to 100
 * set desktop resolution to something reasonable?
*/

getStatus = function(testId) {
    return new Promise((resolve)=>{
        const wpt = new webpagetest();
        wpt.getTestStatus(testId, {request: 12345}, (err,data) => {
            if (err) throw new Error(err);
            return resolve(data);
        })
    })
}

submitTest = function(url,server=null,location=null,opts=null) {
    return new Promise((resolve) => {
        server = (server==null?defaultServer:server);
        let iq = 100;
        const wpt = new webpagetest(server);
        if (opts) {
            let iq = (opts.iq==undefined?100:opts.iq);
        }
        wpt.runTest(url, {location:location,disableOptimization:true,jpegQuality:iq,video:true,key:wptAPIkey}, (err, data) => {
            console.log(err || data);
            if (err) throw new Error(err);
            return resolve(data);
        });
    })
}

getResultSummary = function(testId,server=null,requests=false) {
    return new Promise((resolve) => {
        let opts = {};
        opts.requests = requests;
        server = (server==null?defaultServer:server)
        const wpt = new webpagetest(server);
        wpt.getTestResults(testId, opts=opts, (err,data) => {
            if (err) throw new Error(err);
            return resolve(data);
        })
    })
} 

getLocations = function(server) {
    return new Promise((resolve) => {
        const wpt = new webpagetest(server);
        wpt.getLocations((err,data) => {
            if (err) throw new Error(err);
            return resolve(data);
        })
    })
}

createHeatmap = function(testId,testDir) {
    return new Promise((resolve,reject) => {
        if (testDir==undefined) {
            let testDir = path.join('public','tests');
        }
        const wpt = new webpagetest();
        
        wpt.getTestStatus(testId, {request: 12345}, (err,data) => {
            if (err) throw new Error(err);
            else if (data.statusCode == 200) {
                generateHeatmap(testId,testDir);
            }
            else {
                return data.statusCode;
            }
        });
        
        const generateHeatmap = function(testId,testDir) {
            let dir = path.join(testDir,testId);
            let tmpdir = path.join(dir,'tmp');
            
            if (fs.existsSync(dir)){
                fs.removeSync(dir)
            }
            fs.mkdirSync(dir);
            fs.mkdirSync(tmpdir);
            
            /* first get filmstrip images somewhere */
            wpt.getFilmstrip(testId,{},(err,data)=>{
                if (err) throw new Error(err);
                let zip = new admzip(data);
                zip.extractAllTo(tmpdir,true);
                heatmap(tmpdir,dir).then(()=>{
                    fs.removeSync(tmpdir);
                    return resolve(testId);
                });
            });
        }
    })
}

return module.exports = {
    createHeatmap: createHeatmap,
    getStatus: getStatus,
    submitTest: submitTest,
    getLocations:getLocations,
    getResultSummary
}
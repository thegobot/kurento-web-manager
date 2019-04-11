const express = require('express');
const utils = require('./utils');
const app = express();

const config = require('./config');
const bodyParser = require('body-parser');
const httpPort = 4000;
const pug = require('pug');
const kurento = require('kurento-client');
const Element = require('./Kurento').Element;



app.set('views', __dirname + '/views');
app.set('view engine', 'pug');
app.use(express.static(__dirname + '/static'));
app.use( bodyParser.json() );
app.use(bodyParser.urlencoded({extended: false}));


express.response.error = function(err){
    if(!err)  err = "Ошибка запроса";
    error(err);
    this.status(500);
    this.render('error', {error: err})
};

let servers = config.servers;

templateGlobal = {
    servers: servers,
    utils: utils
};

let kurentoManager;



app.get('/', (req, res) => {

    res.render('home', {})

});

app.post('/api/:func', (req, res) => {
    let func = req.params.func;

    let api = new Api(res);

    api.call(func, req.body).then(() => {
        res.json(api.result());
    }).catch(() => {

        res.json(api.result());
    });


});

app.get('/host/:host', (req, res) => {


    let host = req.params.host || "";


    if(host) {

        kurentoManager.setCurrentServer(host).then((_kurentoClient) => {

            kurentoManager.kclient().getServerManager().then(function(serverManager){

                Promise.all([serverManager.getMetadata(), serverManager.getUsedMemory(), serverManager.getInfo(), serverManager.getPipelines()]).then(function(response){
                    let meta = response[0];
                    let mem = response[1];
                    let info = response[2];
                    let pipelines = response[3];
                    let pipelinesPromises = [];
                    let pipelineActive = null;

                    log(pipelines);


                    Element.fromArray(pipelines).then(function(pipelines){
                        let vars = {host: host, header: host.host, info: info, pipelines: pipelines, mem: mem};
                        res.render('host', vars);
                    }).catch(() => {
                        res.error();
                    });


                }).catch((err) => {
                    res.error();
                });


            });
        }).catch(function(){
            res.error();
        });


    }else{
        res.error("Сервер не найден");
    }

});


class KurentoManager{

    constructor(servers){
        this._kclient = null;
        this.servers = servers;
    }


    setCurrentServer(host){
        let hosto = this.servers[host] || "";
        let wsurl = "ws://"+hosto.host+":"+hosto.port+"/kurento";

        log("set host", host);

        this._kclient = new kurento(wsurl, {failAfter: 1}, function (err, _kurentoClient) {
            if(err){
                error(err);
                error("нет соединения c <strong>" + wsurl + "</strong>");
            }

            log("host connected!", host);

        });

        return this._kclient;
    };

    kclient(){
        if(this._kclient){
            return this._kclient;
        }else{
            throw new AppException("kurento server not connected");
        }
    }
}



class Api{
    constructor(){
        this.res = {};
        this.success = false;
        this.error = "";
        this._reject = null;
        this._resolve = null;
    }

    call(func, post){
        return new Promise((resolve, reject) => {

            this._reject = reject;
            this._resolve = resolve;

            log("call api", func);
            if(typeof this[func] === "function"){
                try {
                    this[func](post);
                }catch(e){
                    this.reject(e.message);
                }
            }else{
                error("func not found", func);
                this.reject("func not found");
            }
        });

    }

    exception(text){
        if(!text) text = "internal error";
        throw new AppException(text);
    }

    reject(err){
        this.error = err;
        this.success = false;
        if(this._reject) this._reject(err);
    }

    resolve(result){
        this.error = "";
        this.success = true;
        this.res = result;
        if(this._resolve) this._resolve(result);
    }

    result(){

        let error = "";
        if(typeof this.error === "string"){
            error = this.error;
        } else if(typeof this.error === "object"){
            if(this.error.message) error = this.error.message;
        }

        return {
            error: error,
            res: this.res,
            success: this.success
        };
    }

    objects(data){
        let id = data.id;
        if(!id) this.exception("id empty");

        kurentoManager.kclient().getMediaobjectById(id, (err, obj) => {

            if(err){
                this.exception(err);
            }

            obj.getChilds((err, childs) => {

                if(err){
                    this.exception(err);
                }

                Element.fromArray(childs).then((elements) => {
                    if(elements.length > 0) {
                        app.render("objects", {items: elements}, (err, html) => {
                            if (err) this.exception(err);
                            this.resolve(html);
                        });
                    }else{
                        this.resolve();
                    }


                }).catch((err) => {
                    error(err);
                    this.reject(err);
                });
            });


        });

    }

    remove(data){
        let id = data.id;
        if(!id) this.exception("id empty");
        kurentoManager.kclient().getMediaobjectById(id, (err, obj) => {
            if(err){
                this.exception(err);
            }

            obj.release((err) => {
                if(err){
                    this.exception(err);
                }

                this.resolve();

            });
        })
    }

    edit(data){
        let id = data.id;
        if(!id) this.exception("id empty");

        kurentoManager.kclient().getMediaobjectById(id, (err, obj) => {
            if(err){
                this.exception(err);
                return;
            }

            new Element(obj).then((element) => {

                app.render("edit", {element: element}, (err, html) => {
                    if (err) this.exception(err);
                    this.resolve(html);
                });


            }).catch( (err) => {
                this.reject(err);
            });
        })
    }

    info(data){
        let id = data.id;
        if(!id) this.exception("id empty");

        kurentoManager.kclient().getMediaobjectById(id, (err, obj) => {
            if(err){
                this.exception(err);
                return;
            }

            new Element(obj).then((element) => {

                element.getExtended().then(() => {

                    app.render("info", {element: element}, (err, html) => {
                        if (err) this.exception(err);
                        this.resolve(html);
                    });

                }).catch((err) => {
                    this.reject(err);
                });

            }).catch( (err) => {
                this.reject(err);
            });
        })
    }

    saveObject(data){
        let id = data.id;
        if(!id) this.exception("id empty");

        let name = data.name;
        let some = undefined;

        kurentoManager.kclient().getMediaobjectById(id, (err, obj) => {
            if(err){
                this.exception(err);
                return;
            }

            let promises = [];

            if(typeof name === "string"){
                promises.push(obj.setName(name));
            }

            if(typeof some === "string"){

            }


            if(promises.length > 0){
                Promise.all(promises).then((results) => {
                    this.resolve();
                }).catch(() => {
                    this.reject();
                })
            }else{
                this.resolve();
            }

        })

    }
}

class AppException extends Error{

}



let defHost = Object.keys(servers)[0];
log("set default host", defHost);
kurentoManager = new KurentoManager(servers);
kurentoManager.setCurrentServer(defHost);

app.listen(httpPort, () => log(`Kurento manager listening on port ${httpPort}!`));


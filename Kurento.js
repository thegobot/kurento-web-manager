const moment = require('moment');

class Manager{
    constructor(client){
        if(client) {
            this.setClient(client);
        }
    }

    setClient(client){
        this.client = client;
    }

    getClient(){
        return this.client;
    }

    create(name){
        return new Promise((resolve, reject) => {
            this.getClient().create(name, (err, element) => {
                if(err) reject();

                (new Element(element)).then((el)=> {
                    resolve(el);
                }).catch(()=>{
                    reject();
                })
            })
        });

    }

    getByName(name){

        return new Promise((resolve, reject) => {

            this.getClient().getServerManager().then(function(serverManager){

                serverManager.getPipelines((err, pipelines) => {
                    if(err){
                        reject(err);
                        return;
                    }

                    Element.fromArray(pipelines).then(function(elements){
                        let element = null;
                        elements.forEach((_element) => {
                            if(_element.name === name){
                                element = _element;
                                return false;
                            }
                        });

                        if(element){
                            resolve(element)
                        }else{
                            resolve();
                        }



                    }).catch(() => {
                        reject();
                    });

                }).catch(() => {
                    reject();
                })



            }).catch(() => {
                reject();
            });
        })


    }
}

/**
 *    __type__: 'RTCInboundRTPStreamStats',
     associateStatsId: '',
     bytesReceived: 33989708,
     codecId: '',
     firCount: 0,
     fractionLost: 0,
     id: '051ced3c-fd47-4b98-ba42-3bbd62202951',
     isRemote: false,
     jitter: 0.00252083339728415,
     mediaTrackId: '',
     nackCount: 0,
     packetsLost: 0,
     packetsReceived: 423636,
     pliCount: 0,
     remb: 0,
     sliCount: 0,
     ssrc: '1191328743',
     timestamp: 1522670491,
     transportId: '',
     type: 'inboundrtp' },
 */

class Stats{
    constructor(response){

        if(response && typeof response === "object") {
            Object.keys(response).forEach((id) => {
                let stat = response[id];

                this.received = stat.bytesReceived || 0;
                this.sended = stat.bytesSent || 0;
            });
        }

    }
}

class Element{

    constructor(mediaobject){

        this.id = mediaobject.id;
        this.className = mediaobject.constructor.name;
        this._raw = mediaobject;
        this.childs = [];
        this.icesState = [];
        this.icesPair = [];
        this.sec = 0;



        return new Promise((resolv, reject) => {


            Promise.all([mediaobject.getName(), mediaobject.getChilds(), mediaobject.getCreationTime()]).then((response) => {

                let name = response[0] || this.id;

                let arr = name.split("/");
                this.name = arr.length > 1 ? arr[arr.length-1] : name;

                this.childs = response[1];
                this.time = new Date(response[2] * 1000);


                let duration = moment.duration((new Date() - this.time));
                this.durationHumman = (duration.days() ? duration.days() +" days " : "") + duration.hours() +":"+ duration.minutes() +":"+ duration.seconds()

                this.childsCount = this.childs.length;

                let extendedPromises = [];

                if(this.className === "WebRtcEndpoint" ){
                    extendedPromises.push(mediaobject.getConnectionState((err, state) => {
                        this.state = state;
                    }));

                    extendedPromises.push(mediaobject.getIceConnectionState((err, ices) => {
                        if(err){
                            error(err);
                            return;
                        }

                        this.icesState = ices;
                    }));

                    extendedPromises.push(mediaobject.getMediaState((err, state) => {
                        if(err){
                            error(err);
                            return;
                        }

                        this.mediaState = state;
                    }));

                    extendedPromises.push(mediaobject.getStats((err, response) => {
                        if(err){
                            error(err);
                            return;
                        }

                        this.stats = new Stats(response);
                    }));



                }

                if(extendedPromises.length > 0) {
                    Promise.all(extendedPromises).then(() => {
                        resolv(this);
                    }).catch((err) => {
                        reject(err);
                    })
                }else{
                    resolv(this);
                }



            }).catch((err) => {
                error(err);
                reject(err);
            });


        });

    }

    normalizeComponent(obj){
        let res = {};
        Object.keys(obj).forEach((prop) => {
            res[prop] = obj[prop];
            let lc = prop.toLowerCase();
            if(lc !== prop){
                res[lc] = obj[prop];
            }

        });

        return res;
    }

    isComponentEqual(obj1, obj2){
        obj1 = this.normalizeComponent(obj1);
        obj2 = this.normalizeComponent(obj2);

        //log("isComponentEqual", obj1, obj2);
        return obj1.componentid === obj2.componentid && obj1.streamid === obj2.streamid;
    }

    isIceConnected(ice){
        let states = this.icesState;
        let res = false;
        states.forEach((state) => {
            log("isComponentEqual", this.isComponentEqual(state, ice));
            if(this.isComponentEqual(state, ice) && state.state === "READY"){
                res = true;
            }
        });

        return res;
    }

    icesStateConnected(){
        let states = this.icesState;
        let connected = 0;
        states.forEach((state) => {
            if(state.state === "READY"){
                connected++;
            }
        })

        return states.length > 0 && connected === states.length;
    }

    getExtended(){
        let mediaobject = this._raw;
        return new Promise((resolv, reject) => {

            let extendedPromises = [];

            if(this.className === "WebRtcEndpoint" ){

                extendedPromises.push(mediaobject.getICECandidatePairs((err, ices) => {
                    log("CandidatePairs", ices);
                    this.icesPair = ices;
                }));


                //getMaxAudioRecvBandwidth
                //getMaxOuputBitrate
                //getMaxOutputBitrate
                //getMaxVideoRecvBandwidth
                //getMediaState
                //getStunServerAddress
                //getStunServerPort



            }

            if(extendedPromises.length > 0) {
                Promise.all(extendedPromises).then(() => {
                    resolv(this);
                }).catch((err) => {
                    reject(err);
                })
            }else{
                resolv(this);
            }

        });

    }

    getByName(name, type){
        let webRtcEndpoint = null;

        return new Promise((resolve, reject) => {
            let element = null;

            this.childs.forEach(function(media){
                if(!type || media.constructor.name === type){
                    element = media;
                    return false;
                }
            });

            if(element){
                (new Element(element)).then((el) => {
                    resolve(el);
                }).catch(() => {
                    reject();
                })
            }else{
                resolve(element);
            }



        });

    }

    static fromArray(elements){

        return new Promise((resolv, reject) => {

            let promises = [];

            elements.forEach(function(element){
                promises.push(new Element(element));
            });

            Promise.all(promises).then(function(elements){
                resolv(elements);
            }).catch((err) => {
                reject(err);
            });
        });

    }

}


module.exports.Element = Element;
module.exports.Manager = Manager;
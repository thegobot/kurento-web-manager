"use strict";

function KurentoManager(){

    function request(f, post){
        let defered = $.Deferred();
        let url =  "/api/"+f;
        log(post);
        $.ajax({
            method: "post",
            url: url,
            data: post,
            success: function(result){

                try {
                    if(typeof result !== "object") {
                        result = JSON.parse(result);
                    }
                }catch(e){
                    error(result);
                    defered.reject(e.message);
                    return;
                }

                if(result.success) {
                    defered.resolve(result.res);
                }else{
                    defered.reject(result.error || "internal error");
                }
            },
            error: function(xhr){
                log(xhr);
                defered.reject(url + " request error: code: " + xhr.status +", mess: "+ xhr.statusText);
            },
            complete: function(){

            }
        });

        return defered;
    }

    function req(f, opt){
        let r = request(f, opt);

        r.catch(function(err){
            alert("Api request fail: " + err);
        });

        return r;
    }

    function events(){

        $(document).on("click", "[data-object]", function(ev){
            let target = $(ev.target);
            if(!target.hasClass("loaderEl")) return false;

            let iscollapse = target.hasClass("plus") || target.hasClass("minus");


            let item = $(this);
            let id = $(this).data("object");
            let sub = item.next(".sub");
            let plus = item.find(".plus");
            let minus = item.find(".minus");
            let loader = sub.children(".loader");



            if(iscollapse && item.hasClass("loaded")){
                if(target.hasClass("minus")){
                    sub.addClass("d-none");
                    plus.removeClass("d-none");
                    minus.addClass("d-none");
                }else{
                    sub.removeClass("d-none");
                    minus.removeClass("d-none");
                    plus.addClass("d-none");
                }

                return false;
            }

            loader.removeClass("d-none");
            sub.removeClass("empty").removeClass("d-none");
            sub.children(".data").html("");

            req("objects", {id: id}).then(function(res){
                if(!res) res = "none";
                sub.children(".data").html(res);

                plus.addClass("d-none");
                minus.removeClass("d-none");
                loader.addClass("d-none");
                item.addClass("loaded");
            });

            return false;
        })

        $(document).on("click", "[data-object] .btn.remove", function(ev){
            let $this = $(this);

            if(confirm("Remove this media object?")){
                let item = $(this).parents(".item:first");
                let id = item.data("object");
                $this.find(".fa").addClass("fa-spinner fa-spin");
                req("remove", {id: id}).then(function(res){
                    item.remove();
                });
            }
        })

        $(document).on("click", "[data-object] .btn.edit", function(ev){
            let $this = $(this);
            let item = $this.parents(".item:first");
            let id = item.data("object");
            $this.find(".fa").addClass("fa-spinner fa-spin");
            req("edit", {id: id}).then(function(html){
                $this.find(".fa").removeClass("fa-spinner fa-spin");
                modal(html);

            });

        })

        $(document).on("click", "[data-object] .btn.info", function(ev){
            let $this = $(this);
            let item = $this.parents(".item:first");
            let id = item.data("object");
            $this.find(".fa").addClass("fa-spinner fa-spin");

            req("info", {id: id}).then(function(html){
                $this.find(".fa").removeClass("fa-spinner fa-spin");
                modal(html);
            });

        })


        $(document).on("click", ".modal.ajax .submit-trigger", function(){
            let strigger = $(this);
            let modal = $(this).parents(".modal:first");
            let form = modal.find("form");
            if(form.length ===0) return false;
            let submitBtn = form.find("[type=submit]");

            if(!form.data("formAjax")){
                formAjax(form);
                let formElems = form.find("input,select,textarea");
                form.on("app:submiting", function(){
                    strigger.attr("disabled", "disabled");
                    formElems.attr("disabled", "disabled");
                })

                form.on("app:complete", function(){
                    strigger.removeAttr("disabled");
                    formElems.removeAttr("disabled");
                })

                form.on("app:success", function(){
                    modal.modal("hide");
                })

            }

            if(submitBtn.length === 0){
                submitBtn = $('<button type="submit" class="d-none">');
                form.append(submitBtn);
            }

            submitBtn.trigger("click");
        })

    }

    function modal(html){
        let modal = $(html);
        $('body').append(modal);
        modal.modal("show");
    }


    function formAjax(form){

        form.data("formAjax", formAjax);

        form.ajaxForm({

            type: "post",
            dataType: "json",

            beforeSubmit: function(){
                form.trigger("app:submiting");
            },

            success: function(response){
                if(response.success){
                    form.trigger("app:success", response.res);
                }else{
                    let err = response.error || "request error";
                    form.trigger("app:error", error);
                    alert(err);
                }

                form.trigger("app:complete");
            },

            error: function(xhr, err){
                form.trigger("app:complete");
                alert(err);
            }
        })
    }

    function _log(type){


        let args = [].slice.call(arguments);
        //console.log(args);

        if(typeof console !== 'undefined'){
            type = type || "debug";
            if(type in console) {
                console[type].apply(console, args[1]);
            }
        }
    }

    function log(){
        _log("log", arguments);
    }


    function error(){
        _log("error", arguments);
    }

    $(function(){
        events();
    });

}

new KurentoManager();
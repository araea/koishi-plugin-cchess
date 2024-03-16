(function () {
    var a = null;
    self.onmessage = function (s) {
        if (null != s.data.command) a.send_command(s.data.command); else if (null != s.data.wasm_type) {
            let e = s.data.wasm_type, t = s.data.origin;
            self.importScripts(t + "/wasm/" + e + "/pikafish.js"), self["Pikafish"]({
                locateFile: a => "pikafish.data" == a ? t + "/wasm/data/" + a : t + "/wasm/" + e + "/" + a,
                setStatus: a => {
                    self.postMessage({download: a})
                }
            }).then((s => {
                a = s, s.read_stdout = a => self.postMessage({stdout: a}), self.postMessage({ready: !0})
            }))
        }
    }
})();
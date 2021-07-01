
/**
 * **************************************
 * エクスプレスサーバ・ソケットサーバの基本設定
 * **************************************
 */

// SSL準備
var fs = require("fs");

var ssl_server_key = "";
var ssl_server_crt = "";
var port = 0;

const ENV = "PROD";

if (ENV == "TEST") {
    port = 8446;
    ssl_server_key = "/etc/letsencrypt/live/conftest.aice.cloud/privkey.pem";
    ssl_server_crt = "/etc/letsencrypt/live/conftest.aice.cloud/fullchain.pem";

} else {
    port = 8445;
    ssl_server_key = "/etc/letsencrypt/live/conference.aice.cloud/privkey.pem";
    ssl_server_crt = "/etc/letsencrypt/live/conference.aice.cloud/fullchain.pem";
}

var options = {
    key: fs.readFileSync(ssl_server_key),
    cert: fs.readFileSync(ssl_server_crt),
};
var express = require("express");
var app = express();
var server = require("https").createServer(options, app);
var io = require("socket.io")(server);

// テンプレートエンジン
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");
app.set("public", __dirname + "/public");

// POSTにも対応
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


/**
 * ****************************************************
 * ルーティング
 * ****************************************************
 */

/**
 * 会議室ページ
 */
app.get("/", async (request, response) => {

    // 招待されたモードの時
    // ルームを照合して遷移
    await db.room.findAll({
        where: {
            secret: secret
        }
    }).then((room) => {

        // 会議室ページへ遷移
        var data = {
            room_id: "testroom",
            room_name: "testroom",
        };
        response.render("./testroom.ejs", data);
    }); 

    // レンダリングを行う
    response.render("./room_mtg_renew.ejs", data);
});

// ファイル置き場
app.use(express.static(__dirname + "/public"));

// リッスン開始
server.listen(port, function () {
    console.log("Server listening at port %d", port);
});

/**
 * ****************************************************
 * ソケットの設定
 * ****************************************************
 */
io.on("connection", function (socket) {
    // ---- multi room ----
    socket.on("enter", function (roomname) {
        socket.join(roomname);
        console.log("id=" + socket.id + " enter room=" + roomname);
        setRoomname(roomname);
    });

    function setRoomname(room) {
        socket.roomname = room;
    }

    function getRoomname() {
        var room = socket.roomname;
        return room;
    }

    function emitMessage(type, message) {
        // ----- multi room ----
        var roomname = getRoomname();

        if (roomname) {
            //console.log('===== message broadcast to room -->' + roomname);
            socket.broadcast.to(roomname).emit(type, message);
        } else {
            console.log("===== message broadcast all");
            socket.broadcast.emit(type, message);
        }
    }

    // When a user send a SDP message
    // broadcast to all users in the room
    socket.on("message", function (message) {
        var date = new Date();
        message.from = socket.id;
        //console.log(date + 'id=' + socket.id + ' Received Message: ' + JSON.stringify(message));

        // get send target
        var target = message.sendto;
        if (target) {
            //console.log('===== message emit to -->' + target);
            socket.to(target).emit("message", message);
            return;
        }

        // broadcast in room
        emitMessage("message", message);
    });

    // When the user hangs up
    // broadcast bye signal to all users in the room
    socket.on("disconnect", function () {
        // close user connection
        console.log(new Date() + " Peer disconnected. id=" + socket.id);

        // --- emit ----
        emitMessage("user disconnected", { id: socket.id });

        // --- leave room --
        var roomname = getRoomname();
        if (roomname) {
            socket.leave(roomname);
        }
    });

    // チャットメッセージの配信
    socket.on("chat", function (message) {
        console.log(" chat send. socket.id= " + socket.id + "message= " + message);
        message.from = socket.id;

        // broadcast in room
        emitMessage("chat", message);
    });

    // ログインメッセージの配信
    socket.on("alert", function (message) {
        message.from = socket.id;

        // broadcast in room
        emitMessage("alert", message);
    });

    // PINGの配信
    socket.on("being", function (message) {
        //message.from = socket.id;
        console.log("being received. " + message);
        emitMessage("being", message);
    });

    // 画面共有モードの配信
    socket.on("presen", function (message) {
        message.from = socket.id;
        emitMessage("presen", message);
    });
    socket.on("presenEnd", function (message) {
        emitMessage("presenEnd", message);
    });

    // マイク使用シグナルの配信
    socket.on("talkSignal", function (message) {
        emitMessage("talkSignal", message);
    });
    // マイクリリースシグナルの配信
    socket.on("releaseSignal", function (message) {
        emitMessage("releaseSignal", message);
    });

    // 退出シグナルの配信
    socket.on("leaveSignal", function (message) {
        emitMessage("leaveSignal", message);
    });

    // 投票シグナルの配信
    socket.on("vote", function (message) {
        emitMessage("vote", message);
    });
    // リンクパラメータの配信
    socket.on("roomhash", function (message) {
        var data = {
            room_name: message.room_name,
            password: message.password,
        };
        // const result = executeEncrypt(JSON.stringify(data));
        socket.emit("roomhash", data);
    });
});


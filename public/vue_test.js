

/**
 * *************************************************************************
 * チャットのコンテンツを制御するVue
 */
var chatVue = new Vue({
  el: "#chatapp",

  data: {
    contents: [
      {
        // id: 1,
        // text: "ルームに参加しました。左下のカメラボタンでスタートしてください。"
      },
    ],
  },

  computed: {
  },

  methods: {
    // チャットメッセージを受信したら呼ばれる
    addContent: function (msg) {
      var date = new Date();
      var a = date.getTime();
      var nowtime = Math.floor(a / 1000);
      var newMessage = {
        id: nowtime,
        text: msg,
      };
      this.contents.push(newMessage);

    },
  },
});

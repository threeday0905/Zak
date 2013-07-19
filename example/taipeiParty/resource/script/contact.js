Zak.registerScript("contact", {
  render: function(page) {
    var btn, sender, story, device_str, device = window.device;
    btn = page.find("#submitBtn");
    sender = page.find("#sender");
    story = page.find("#story");
    device_str = device ? (device.model + "_" + device.platform + "_" + device.version) : "";
    swak.evt.touch(btn, function() {
      $.post("http://beerfriday.net/tpp/post/contactus.php", { sender: sender.value, story: story.value, device: device_str }, function(data){
        if ( data === "OK" ) {
          btn.disabled = true;
          sender.disabled = true;
          story.disabled = true;
          alert("資料已經傳送") ;
        }
        else {
          alert( data );
        }
      });
    });
  }
});
//# sourceURL=\source\script\contact.js

// for cross browser
const AudioContext = window.AudioContext || window.webkitAudioContext;
let context;
let Karaoketrack;

function startKaraokeSong() {
    karaokeSong.play();
}

// Fades between 0 (all source 1) and 1 (all source 2)
 function crossfade(element) {
    var x = parseInt(element.value) / parseInt(element.max);
    // Use an equal-power crossfading curve:
    var gain1 = Math.cos(x * 0.5 * Math.PI);
    var gain2 = Math.cos((1.0 - x) * 0.5 * Math.PI);

    console.log(gain1, gain2)
    micBlog.gainNode.gain.value = gain1;
    songBlog.gainNode.gain.value = gain2;
};

window.onload = (event) => {
    const karaokeSong = document.getElementById("karaokeSong")
    context = new AudioContext();
    Karaoketrack = context.createMediaElementSource(karaokeSong);
};

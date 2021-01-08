// all data is taken from http://www.piano-midi.de/midi_files.htm

var fs = require("fs");
const { parse } = require('json2csv');
var parseMidi = require('midi-file').parseMidi;
var alphabet = "\nabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890`~!@#$%^&*()-=[]\\;',./+{}|:\"<>?";

var allTranspose = fs.readFileSync("smaller_set_keys","utf8").split("\r\n")
allTranspose.forEach((x,i)=>{
	allTranspose[i] = [x.split("=")[0], Number(x.split("=")[2])];
})

var allPieces = [];
//get all pieces in the classical folder which will be used:
fs.readdirSync("../just_classical/").map(a=>({sort:Math.random(), value:a}))
.sort((a, b) => a.sort - b.sort)
.map((a) => a.value)
.forEach(file => {
	if(file.slice(0,8) != "clementi") return; // the dataset was too big before

	var input = fs.readFileSync("../classical/"+file);
	var tracks = parseMidi(input).tracks.slice(1);
	var transposeNum = allTranspose[allTranspose.map(x=>x[0]).indexOf(file)][1]

	//we only want track 1 and 2 (right and left hands)
	var rMidi = tracks[0].slice(2);
	var lMidi = tracks[1].slice(2);

	//this will be it in a better format
	var reformatted = [];

	var rI = 0;
	var lI = 0;
	var rTime = 0;
	var lTime = 0;

	while(rI < rMidi.length || lI < lMidi.length){
		if(rI<rMidi.length && (lI>=lMidi.length || rTime + rMidi[rI].deltaTime <= lTime + lMidi[lI].deltaTime)){
			// add the right note because it comes before

			rTime += rMidi[rI].deltaTime;

			if(rMidi[rI].type == "noteOn"){
				reformatted.push({
					type: "open",
					time: rTime,
					deltaTime: reformatted.length==0 ? 3000 : rTime-reformatted[reformatted.length-1].time, 
					note: rMidi[rI].noteNumber + transposeNum
				});

			}else if(rMidi[rI].type == "noteOff"){
				reformatted.push({
					type: "close",
					time: rTime,
					deltaTime: reformatted.length==0 ? 3000 : rTime-reformatted[reformatted.length-1].time, 
					note: rMidi[rI].noteNumber + transposeNum
				});
			}
			rI ++

		}else{
			// add the left note because it comes before

			lTime += lMidi[lI].deltaTime;

			if(lMidi[lI].type == "noteOn"){
				reformatted.push({
					type: "open",
					time: lTime,
					deltaTime: reformatted.length==0 ? 3000 : lTime-reformatted[reformatted.length-1].time, 
					note: lMidi[lI].noteNumber + transposeNum,
				});

			}else if(lMidi[lI].type == "noteOff"){
				reformatted.push({
					type: "close",
					time: lTime,
					deltaTime: reformatted.length==0 ? 3000 : lTime-reformatted[reformatted.length-1].time, 
					note: lMidi[lI].noteNumber + transposeNum,
				});
			}
			lI ++
		}
	}

	allPieces = allPieces.concat(reformatted);
});

// Go from on and off to just one list
var final = [];
var openNotes = [];

var numNotes = allPieces.length;
var deltaTime = 0;

allPieces.forEach((item,index)=>{
	if(item.type == "open"){
		var numSpacers = Math.ceil((item.deltaTime-5)/120); // each spacer represents 120 milliseconds

		final.push(...new Array(numSpacers).fill([0,...openNotes]).flat())

		if(!openNotes.includes(item.note)) openNotes.push(item.note);

	}else if(item.type == "close"){
		var numSpacers = Math.ceil((item.deltaTime-5)/120); // each spacer represents 120 milliseconds

		final.push(...new Array(numSpacers).fill([0,...openNotes]).flat())

		var ind = openNotes.indexOf(item.note);
		if(ind !== -1){
			openNotes = openNotes.slice(0,ind).concat(openNotes.slice(ind+1)); //remove it from the list of notes
		}
	}
});


var asStr = final.map(i=>alphabet[i]).join("");
var asList = asStr.split("\n").map(i=>{return {note:i}});

console.log(asStr);

//convert to CSV and save
var csv = parse(asList, {fields: ["note"]});
fs.writeFile("as_csv.csv",csv,err=>console.error(err));
console.log("Size:",asList.length);
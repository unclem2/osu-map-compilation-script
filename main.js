const fs = require('fs');
const audioProc = require('./audio.js');
// Initialize variables
let mapLength = [0];
let mapContent = [];
let metadataInput = [];
let splitLine = [];
let count = 0;
let mapLimit = 0;
let offset = 0;
let imported = 0;
let prevRedTime = 0;
let mergedTimeStamp = [];
let mergedObject = [];
let sliderMultiplier = [];
let metadataString = '';
let mergedMap = '';
let colorString = '[Colours]\r\nCombo1 : 255,0,0\r\nCombo2 : 0,255,0\r\nCombo3 : 0,0,255\r\n\r\n';
let temp = '';
let temppos = 0;
let queued = false;
let audioMergeMode = false;

console.log('---osu! Compilation Map making script by NeroYuki---');
console.log('Map count: ');

const args = process.argv.slice(2);

// Check if audio merge mode is enabled
if (args.includes('-audio')) {
  audioMergeMode = true;
}

// Handle map count input
const mapCountIndex = args.indexOf('-mapcount');
if (mapCountIndex !== -1) {
  const mapCount = parseInt(args[mapCountIndex + 1]);
  if (!isNaN(mapCount)) {
    mapLimit = mapCount;
  } else {
    console.log('Invalid map count');
    process.exit(1);
  }
}

// Handle metadata input
const titleIndex = args.indexOf('-title');
const artistIndex = args.indexOf('-artist');
const creatorIndex = args.indexOf('-creator');
const versionIndex = args.indexOf('-version');
const hpIndex = args.indexOf('-hp');
const csIndex = args.indexOf('-cs');
const odIndex = args.indexOf('-od');
const arIndex = args.indexOf('-ar');

if (
  titleIndex === -1 ||
  artistIndex === -1 ||
  creatorIndex === -1 ||
  versionIndex === -1 ||
  hpIndex === -1 ||
  csIndex === -1 ||
  odIndex === -1 ||
  arIndex === -1
) {
  console.log('Invalid metadata input');
  process.exit(1);
}

metadataInput.push(args[titleIndex + 1]);
metadataInput.push(args[artistIndex + 1]);
metadataInput.push(args[creatorIndex + 1]);
metadataInput.push(args[versionIndex + 1]);
metadataInput.push(args[hpIndex + 1]);
metadataInput.push(args[csIndex + 1]);
metadataInput.push(args[odIndex + 1]);
metadataInput.push(args[arIndex + 1]);

// Start processing
if (audioMergeMode) {
  console.log('---Audio Merging Mode (EXPERIMENTAL)---');
  audioProc.audio_merge(mapLimit, (song_res) => {
    for (const song of song_res) {
      mapLength.push(song.length);
    }
    mapProcessing();
  });
} else {
  mapProcessing();
}



function mapProcessing() {
	console.log(mapLength);
	console.log(metadataInput);
	imported = 0; // Reset the imported counter
	readMapFile(); // Start reading map files
  }
  
  function readMapFile() {
	if (imported === mapLimit) {
	  breakdownMap(mapContent);
	  return;
	}
  
	const filename = `input/${imported + 1}.osu`;
	fs.readFile(filename, 'utf8', (err, data) => {
	  if (err) {
		console.log(`Error reading file: ${filename}`);
		process.exit(1);
	  }
	  
	  mapContent[imported] = data;
	  imported++;
	  mapLength.push(getMapLength(data));
	  readMapFile();
	});
  }
  
  function getMapLength(mapData) {
	const lines = mapData.split('\n');
	for (const line of lines) {
	  if (line.startsWith('SliderMultiplier:')) {
		const sliderMultiplier = parseFloat(line.split(':')[1]);
		if (!isNaN(sliderMultiplier)) {
		  return 60000 / sliderMultiplier;
		}
	  }
	}
	
	console.log(`Invalid map length for map ${imported + 1}`);
	return NaN;
  }
  


function breakdownMap(mapContent) {
	console.log('Breaking down map...');
	for (var j = 0; j < mapLimit; j++) {
	  leadoffset = 0;
	  offset += parseInt(mapLength[j]);
	  console.log('Map ' + (j + 1) + '...');
	  var TimingArea = false;
	  var ObjectArea = false;
	  var line = mapContent[j].split('\n');
	  for (var x = 0; x < line.length; x++) {
		if (
		  line[x] == '\r' ||
		  line[x].includes('[Colours]')
		) {
		  TimingArea = false;
		  ObjectArea = false;
		  continue;
		} else if (line[x].includes('[TimingPoints]')) {
		  TimingArea = true;
		  ObjectArea = false;
		  continue;
		} else if (line[x].includes('[HitObjects]')) {
		  ObjectArea = true;
		  TimingArea = false;
		  continue;
		} else if (line[x].includes('SliderMultiplier:')) {
		  sliderMultiplier.push(
			2.0 / parseFloat(line[x].split(':')[1])
		  );
		} else if (line[x].includes('AudioLeadIn:')) {
		  leadoffset = parseFloat(line[x].split(':')[1]);
		}
		if (TimingArea && sliderMultiplier[j]) {
		  adjustTiming(line[x], offset, sliderMultiplier[j]);
		}
		if (ObjectArea) {
		  adjustObject(line[x], offset);
		}
	  }
	  console.log('Map ' + (j + 1) + ' Merged');
	}
	mapCreate();
  }
  

  function adjustTiming(line, offset, sliderMultiplier) {
  if (Number.isNaN(parseInt(line))) return;

  const values = line.split(',');
  const pos = parseInt(values[0]);
  const mspb = parseFloat(values[1]);

  if (queued) {
    if (temppos !== pos) mergedTimeStamp.push(temp);
    queued = false;
  }

  const adjustedPos = pos + offset;
  values[0] = adjustedPos.toString();

  if (parseFloat(mspb) < 0) {
    const adjustedMspb = mspb * sliderMultiplier;
    values[1] = adjustedMspb.toString();
    line = values.join(',');
    mergedTimeStamp.push(line);
  } else {
    const lineAlt = line;
    const xAlt = lineAlt.split(',');
    temppos = pos;
    xAlt[0] = adjustedPos.toString();
    xAlt[1] = (-100 * sliderMultiplier).toString();
    xAlt[6] = '0';
    temp = xAlt.join(',');
    queued = true;
    line = values.join(',');
    mergedTimeStamp.push(line);
  }
}

function adjustObject(line, offset) {
  if (Number.isNaN(parseInt(line))) return;

  const values = line.split(',');
  const tpos = parseInt(values[2]);
  const type = parseInt(values[3]);

  if (type === 12) {
    const epos = parseInt(values[5]);
    values[5] = (epos + offset).toString();
  }

  values[2] = (tpos + offset).toString();
  line = values.join(',');
  mergedObject.push(line);
}


function mapCreate() {
	initMetadata();
	var mergedMap = metadataString + '[TimingPoints]\r\n' + mergedTimeStamp.join('\n') + '\r\n\r\n' + colorString + '[HitObjects]\r\n' + mergedObject.join('\n');
	//console.log(mergedMap);
	fs.writeFile( 'output/' + metadataInput[1] + ' - ' + metadataInput[0] + ' (' + metadataInput[2] + ') [' + metadataInput[3] + '].osu', mergedMap, 'utf8', (err) => {
		if (err) throw err;
		console.log('The file has been saved!');
	});
}


function initMetadata() {
	metadataString += 'osu file format v14\r\n\r\n[General]\r\nAudioFilename: audio.mp3\r\nAudioLeadIn: 0\r\nPreviewTime: 0\r\nCountdown: 0\r\nSampleSet: Normal\r\nStackLeniency: 0.2\r\nMode: 0\r\nLetterboxInBreaks: 0\r\nWidescreenStoryboard: 1\r\n\r\n';
	metadataString += '[Editor]\r\nBookmarks:0\r\nDistanceSpacing: 1.0\r\nBeatDivisor: 8\r\nGridSize: 16\r\nTimelineZoom: 2\r\n\r\n';
	metadataString += '[Metadata]\r\n'
	metadataString += 'Title:' + metadataInput[0] + '\r\nTitleUnicode:' + metadataInput[0] + '\r\n';
	metadataString += 'Artist:' + metadataInput[1] + '\r\nArtistUnicode:' + metadataInput[1] + '\r\n';
	metadataString += 'Creator:' + metadataInput[2] + '\r\n';
	metadataString += 'Version:' + metadataInput[3] + '\r\n';
	metadataString += 'Source:\r\nTags:\r\nBeatmapID:0\r\nBeatmapSetID:-1\r\n\r\n[Difficulty]\r\n';
	metadataString += 'HPDrainRate:' + metadataInput[4] + '\r\n';
	metadataString += 'CircleSize:' + metadataInput[5] + '\r\n';
	metadataString += 'OverallDifficulty:' + metadataInput[6] + '\r\n';
	metadataString += 'ApproachRate:' + metadataInput[7] + '\r\n';
	metadataString += 'SliderMultiplier:2\r\nSliderTickRate:1\r\n\r\n'
	metadataString += '[Events]\r\n//Background and Video events\r\n//Break Periods\r\n//Storyboard Layer 0 (Background)\r\n'
	metadataString += '//Storyboard Layer 1 (Fail)\r\n//Storyboard Layer 2 (Pass)\r\n//Storyboard Layer 3 (Foreground)\r\n//Storyboard Sound Samples\r\n\r\n'
}

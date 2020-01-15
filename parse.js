const fs = require('fs');
const readline = require('readline');

const TYPE_DIMS = 'dims';
const TYPE_WEIGHT = 'weight';
const KEY_MODEL = 'model';
const KEY_VOLUME = 'volume';
const KEY_WEIGHT = 'weight';
const KEY_PER = 'cubicMmPerGram';

const calcVolume = parts => {
	const mmRegex= /^\d.+\.?\d?\smm/;
	const applyRegex = part => parseFloat(part.match(mmRegex)[0]);
	const height = applyRegex(parts[1]);	
	const width = applyRegex(parts[2]);	
	const depth = applyRegex(parts[3]);	
	return (height * width * depth).toFixed(2);
};

const calcWeight = weightStr => {
	const gramsRegex= /^\d.+\.?\d?\sg/;
	return parseInt(weightStr.trim().match(gramsRegex)[0]);
};

const sort = accum => {
	const order = [
		'1st gen',
		'3G',
		'3GS',
		'4',
		'4S',
		'5',
		'5S',
		'5C',
		'SE',
		'6',
		'6 Plus',
		'6S',
		'6S Plus',
		'7',
		'7 Plus',
		'8',
		'8 Plus',
		'X',
		'XS',
		'XS Max',
		'XR',
		'11',
		'11 Pro',
		'11 Pro Max'
	];

	return Object
		.keys(accum)
		.map(key => ([
			accum[key][KEY_MODEL],
			accum[key][KEY_WEIGHT],
			accum[key][KEY_VOLUME],
			accum[key][KEY_PER],
		]))
		.sort((a, b) => {
			return order.indexOf(a[0]) > order.indexOf(b[0]) ? 1 : -1;
		});
};

const convertToCsv = sorted => 
	sorted
		.map(data => data.join(','))
		.join('\n');

const recordModel = (model, key, val, accum) => {
	if (typeof accum[model] === 'undefined') {
		accum[model] = {
			[KEY_MODEL]: model, 
			[KEY_VOLUME]: null, 
			[KEY_WEIGHT]: null, 
			[KEY_PER]: null
		};
	}
	accum[model][key] = val;

	if (accum[model][KEY_WEIGHT] && accum[model][KEY_VOLUME]) {
		accum[model][KEY_PER] = (accum[model][KEY_VOLUME] / accum[model][KEY_WEIGHT]).toFixed(2);
	}
}

const parseFile = (file, type, accum) => 
	new Promise((resolve, reject) => {
		const reader = readline.createInterface({
			input: fs.createReadStream(file),
			output: null,
			console: false,
		});

		let parts = [];

		const recordDim = parts => {
			const model = parts[0].replace(':', '');
			const volume = calcVolume(parts);
			
			model.split(' & ').forEach(model => {
				recordModel(model, KEY_VOLUME, volume, accum);
			});
		}

		reader.on('line', line => {
			switch (type) {
				case TYPE_DIMS:
					if (/:/.test(line) === true) {
						if (parts.length) {
							recordDim(parts);
						}
						parts = [line];
					}else {
						parts.push(line);
					}
					break;

				case TYPE_WEIGHT:
					const split = line.split(':');
					const model = split[0];
					const weight = calcWeight(split[1]);

					model.split(' and ').forEach(model => {
						recordModel(model, KEY_WEIGHT, weight, accum);
					});
					break;

				default:
					throw new Error(`Type "${type}" is invalid.`);
			}
		});

		reader.on('close', () => {
			// get the last line
			if (parts.length) {
				recordDim(parts);
			}

			resolve(true);
		})
	});

(async () => {
	const accum = {};
	await parseFile('./dims.csv', TYPE_DIMS, accum);
	await parseFile('./weight.csv', TYPE_WEIGHT, accum);

	const sorted = sort(accum);
	const csvStr = convertToCsv(sorted);
	console.log(csvStr);
})()

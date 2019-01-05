let style = require('./style.json');

keyTypeCheck = (key) => {
    if (typeof key !== 'string')
        throw Error(`Type of key should be string. currently is ${typeof key}.`);
};
valueTypeCheck = (value) => {
    if (!(['string', 'number', 'boolean'].includes(typeof value)))
        throw Error('value type can only be string, number or boolean');
};

featureGetterBySampleValue = (key, sampleValue) => {
    keyTypeCheck(key);
    valueTypeCheck(sampleValue);
    switch (typeof sampleValue) {
        case 'boolean':
            return ['to-boolean', ['get', key]];
        case 'number':
            return ['to-number', ['get', key]];
        case 'string':
            return ['get', key];
    }
};


existentialFilter2Exp = (filter) => {
    if (! filter || !filter.length)
        throw Error("Exactly two arguments are needed in existential filters.");
    if (filter.length !== 2)
        throw Error(`Exactly two arguments are needed in ${filter[0]} filter.`);
    switch (filter[0]) {
        case 'has':
            return filter;
        case '!has':
            filter[0] = 'has';
            return ['!', filter];
        default:
            throw Error(`filter ${filter[0]} is not a existential filter (has or !has)`);
    }
};

membershipFilter2Exp = (filter) => {
  if (! filter || !filter.length)
      throw Error("At least three arguments are needed in membership filters.");
  if (filter.length < 3)
      throw Error(`At least three arguments are needed in ${filter[0]} filter.`);
  switch (filter[0]) { //TODO: type check for filter slice :))
      case 'in':
          return ['match', featureGetterBySampleValue(filter[1],filter[2]),
              filter.slice(2), true, false];
      case '!in':
          return ['match', featureGetterBySampleValue(filter[1],filter[2]),
              filter.slice(2), false, true];
      default:
          throw Error(`filter ${filter[0]} is not a membership filter (in or !in)`);
  }
};

comparisonFilter2Exp = (filter) => {
    if (! filter || !filter.length)
        throw Error("Exactly three arguments are needed in membership filters.");
    if (filter.length !== 3)
        throw Error(`Exactly three arguments are needed in ${filter[0]} filter.`);

    try {valueTypeCheck(filter[2]);} catch (e) {
        console.error(`filter: ${JSON.stringify(filter)}`);
    }
    return [filter[0], featureGetterBySampleValue(filter[1],filter[2]), filter[2]];
};

filter2exp = (filter) =>{
    if(! filter || filter.length === 0)
        throw Error('No filter provided.');
    switch (filter[0]) {
        case '!=': case '==': case '>=': case '<=': case '>': case '<':
            return comparisonFilter2Exp(filter);
        case '!in': case 'in':
            return membershipFilter2Exp(filter);
        case 'has': case '!has':
            return existentialFilter2Exp(filter);
        case 'all': case 'any': case 'none':
            return combiningFilter2Exp(filter);
        default:
            throw Error (`Filter type (${filter[0]}) does not exist or is not supported.`);
    }
};

combiningFilter2Exp = (filter) => {
    if (! filter && !filter.length)
        throw Error("At least two argument are needed in combining filters.");
    if (filter.length < 2)
        throw Error(`At least two argument are needed in "${filter[0]}" filter.`);

    let newFilter = [filter[0]];
    switch (filter[0]) {
        case 'all': case 'any':
            for (let i = 1; i < filter.length; i++)
                newFilter.push(filter2exp(filter[i]));
            return newFilter;
        case 'none':
            filter[0] = 'all'; // Concern: it changes the filter itself :thinking:
            return ['!', combiningFilter2Exp(filter)];
        default: throw Error(`${filter[0]} is not a known combining filter`);
    }
};


let newStyle = Object.assign({},style);
let layers = newStyle.layers;

for (let i = 0; i < layers.length; i++){
    if (!layers[i].filter)
        continue;
    layers[i].filter = filter2exp(layers[i].filter);
}

fs = require('fs');
fs.writeFileSync('./generated-style.json',JSON.stringify(newStyle));

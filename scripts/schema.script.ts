import {$Config} from '../src/config/config.js';

const schema = $Config.toJSONSchema({io: 'input'});
console.log(JSON.stringify(schema, null, 2));

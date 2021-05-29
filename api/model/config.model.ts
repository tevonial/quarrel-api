import * as mongoose from "mongoose";
import {Schema, Document} from 'mongoose'

export interface ConfigurationDoc extends Document {
    scope: string;
    settings: [{key: string, value: string}];
}

const configurationSchema  = new Schema<ConfigurationDoc>({
    scope: String,
    settings: [{key: String, value: String}]
});


mongoose.model('Configuration', configurationSchema, 'config');

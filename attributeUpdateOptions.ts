import { IAttribute } from './projectfile';

export class AttributeUpdateOptions {
    attribute: IAttribute;
    name: string;
    value: any;

    constructor(name: string, attribute: IAttribute, value: any){
        this.name = name;
        this.attribute = attribute;
        this.value = value;
    }
}
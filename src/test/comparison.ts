import { Node, Element } from "@xmldom/xmldom";

function endLog(msg: any, returnValue: boolean) {
    if (msg) console.log(msg);
    console.groupEnd();
    return returnValue;
}

function logMsg(msg: string) {

}

function startLog(msg: string) {
    console.group(msg);
}
const log = {
    enabled: false,
    group: (msg: string) => {
        if (log.enabled) {
            console.group(msg);
        }
    },
    msg: (msg: string) => {
        if (log.enabled) {
            console.log(msg);
        }
    },
    groupEnd: (msg?: string) => {
        if (log.enabled) {
            if (msg) console.log(msg);
            console.groupEnd();
        }
    }
}

function sameObject(obj1: any, obj2: any, name: string = ''): boolean {
    if (obj1 === obj2) {
        return true;
    }

    log.group("CHECKING SAME OBJECT '" + name + "'");
    if (! bothDefined(obj1, obj2, name)) {
        log.groupEnd("-- not both objects are defined: "  + name);
        return false;
    }
    if (typeof(obj1) !== typeof(obj2)) {
        log.groupEnd("-- not the same type of object: "  + name);
        return false;
    }
    if (obj1 instanceof Array) {
        const same = sameArray(obj1, obj2, name);
        log.groupEnd();
        return same;
    } else if (obj1 instanceof Object) {
        for (const key in obj1) {
            if (! sameObject(obj1[key], obj2[key], key)) {
                log.groupEnd("-- not the same: "  + key);
                return false;
            }
        }
        for (const key in obj2) {
            if (obj1[key] === undefined) {
                log.groupEnd(`-- missing ${key} in other object`);
                return false;
            }
        }
    } else if (obj1 !== obj2) {
        log.groupEnd("-- not the same: "  + name);
        return false;
    }

    log.groupEnd();
    return true;
}

function sameArray(arr1: Array<any>, arr2: Array<any>, name: string): boolean {
    log.msg("CHECKING SAME ARRAY")
    if (arr1.length !== arr2.length) {
        log.msg("-- not the same array length, left has " + arr1.length +" and right has " + arr2.length +" items: "+ name);
        return false;
    }
    for (let i = 0; i<arr1.length; i++) {
        if (! sameObject(arr1[i], arr2[i], name + "[" + i + "]")) {
            log.msg("-- not the same array-element["+ i+ "]: " + name);
            return false;
        }
    }
    return true;
}

function bothDefined(obj1: any, obj2: any, name: string = ''): boolean {
    // console.log("CHECKING BOTH DEFINED")
    if (obj1 === null && obj2 !== null) {
        log.msg("-- not the same, left is null: " + name);
        return false;
    }
    if (obj1 !== null && obj2 === null) {
        log.msg("-- not the same, right is null: " + name);
        return false;
    }

    if (obj1 === undefined && obj2 !== undefined) {
        log.msg("-- not the same, left is undefined: " + name);
        return false;
    }
    if (obj1 !== undefined && obj2 === undefined) {
        log.msg("-- not the same, right is undefined: " + name);
        return false;
    }

    // console.log("1 and 2 are both defined, with types " + (typeof(obj1)) +" and " + typeof(obj2))

    return true;
}

export default class Comparison {
    /**
     * Compare the stringified JSON version of both objects and return true if they are the same.
     * @param obj1 
     * @param obj2 
     */
    static sameJSON(obj1: any, obj2: any, withLogging: boolean = false) {
        if (obj1 === obj2) return true;
        if (! bothDefined(obj1, obj2)) return false;
        log.enabled = withLogging;
        const same = sameObject(JSON.parse(JSON.stringify(obj1)), JSON.parse(JSON.stringify(obj2)));
        return same;
    }

    

    /**
     * Compare two XML trees to see if they are the same or not
     * @param tree1 
     * @param tree2 
     */
    static sameXML(tree1: Node, tree2: Node) {
        return contains(tree1, tree2) && contains(tree2, tree1);
    }

    /**
     * Checks whether the arrays have equal content.
     * Based on == comparison of array elements.
     * @param array1 
     * @param array2 
     */
    static sameArray(array1?: Array<any>, array2?: Array<any>) {
        return this.containsArray(array1, array2) && this.containsArray(array2, array1);
    }

    /**
     * Checks whether the main array contains all elements of the sub array.
     * Based on == comparison of array elements.
     * @param main 
     * @param sub 
     */
    static containsArray(main?: Array<any>, sub?: Array<any>) {
        if (main === sub) {
            return true;
        }
        if (main && !sub) {
            return false;
        }
        if (sub && !main) {
            return false;
        }
        const left = main ? main : [];
        const right = sub ? sub : [];

        if (left.length < right.length) {
            return false;
        }

        for (let i = 0; i < right.length; i++) {
            if (!left.includes(right[i])) {
                return false;
            }
        }

        return true;
    }
}


/**
 * Return true if xml1 contains xml2 content.
 * @param xml1 
 * @param xml2 
 */
function contains(xml1: Node, xml2: Node): boolean {
    if (xml1 === xml2) {
        return true;
    }
    if (!xml1 && !xml2) {
        return true;
    }
    if (!xml1 || !xml2) {
        return false;
    }

    const type1 = xml1.constructor.name;
    const type2 = xml2.constructor.name;

    if (type1 !== type2) {
        // console.log("Different types: " + type1 + " and " + type2)
        return false;
    }


    if (type1 == 'Element') {
        return compareElements((<Element>xml1), (<Element>xml2));
    }

    if (type1 == 'Text' || type1 == 'CDATASection') {
        return compareText(xml1, xml2);
    }

    return false;
}

function compareText(xml1: Node, xml2: Node) {
    return xml1.textContent?.trim() == xml2.textContent?.trim();
}

function compareElements(xml1: Element, xml2: Element): boolean {
    if (xml1.localName !== xml2.localName) {
        // console.log("Different tag names: " + xml1.localName + " and " + xml2.localName);
        return false;
    }
    if (xml1.namespaceURI !== xml2.namespaceURI) {
        return false;
    }
    const attr1 = xml1.attributes;
    const attr2 = xml2.attributes;
    if (attr1.length != attr2.length) {
        // console.log("Different number of attributes")
        return false;
    }
    for (let i = 0; i < attr1.length; i++) {
        const a1 = attr1.item(i);
        const a2 = attr2.getNamedItem(a1?.name || '');
        if (!a2) {
            // console.log("Cannot find attribute with name "+a1?.name+" in other element")
            return false;
        }
        if (a1 && a2 && a1.value.trim() != a2.value.trim()) {
            const v1 = a1.value.trim();
            const v2 = a2.value.trim();
            if (v1 != v2) {
                // console.log("Differetn attribute values in element "+xml1.tagName+":\na1 ='"+v1+"'\na2='"+v2+"'")
                return false;

            }
        }
    }
    const children1 = xml1.childNodes;
    const children2 = xml2.childNodes;

    if (children1.length !== children2.length) {
        // console.log("Different number of children")
    }

    for (let i = 0; i < children1.length; i++) {
        const child1 = children1[i];
        const child2 = children2[i];
        if (!contains(child1, child2)) {
            // console.log("Child "+i+" ("+(child1.constructor.name)+") in element "+xml1.tagName+" is different");
            return false;
        };
    }

    return true;
}
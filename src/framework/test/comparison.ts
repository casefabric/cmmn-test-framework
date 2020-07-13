export default class Comparison {
    /**
     * Compare the stringified JSON version of both objects and return true if they are the same.
     * @param obj1 
     * @param obj2 
     */
    static sameJSON(obj1: any, obj2: any) {
        return JSON.stringify(obj1) === JSON.stringify(obj2);
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
        if (array1 === array2) {
            return true;
        }
        if (array1 && !array2) {
            return false;
        }
        if (array2 && !array1) {
            return false;
        }
        const a1 = array1 ? array1 : [];
        const a2 = array2 ? array2 : [];

        if (a1.length != a2.length) {
            return false;
        }

        for (let i = 0; i < a1.length; i++) {
            if (!a2.includes(a1[i])) {
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

    if (type1 == 'Document') {
        return contains((<Document>xml1).documentElement, (<Document>xml2).documentElement);
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
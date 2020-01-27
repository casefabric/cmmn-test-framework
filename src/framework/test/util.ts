export default class Util {
    static compareJSON(obj1: any, obj2: any) {
        // TODO: make this a decent helper function in the framework side of the house
        return JSON.stringify(obj1) === JSON.stringify(obj2);
    }

    /**
    * Simple helper method to wait some time.
    * @param millis 
    */
    static async holdYourHorses(millis: number) {
        // console.log(`Waiting ${millis} milliseconds`);
        await Promise.all([
            new Promise(resolve => setTimeout(resolve, millis))
        ]);
        // console.log('Done waiting. Test continues');
        return;
    }
}
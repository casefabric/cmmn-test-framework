import MockServer from "../../../../../src/mock/mockserver";
import GetMock from "../../../../../src/mock/getmock";

export default class ListDetailsMock extends MockServer {
    getList = new GetMock(this, '/getListWebService', call => {
        const keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        call.json(keys.map(key => ({ id: key })));
    });

    getDetails = new GetMock(this, '/details/:detailsKey', call => {
        const detailsKey = call.req.params['detailsKey'];
        call.json({
            description: `details of '${detailsKey}'`,
            id: detailsKey
        });
    })

    constructor(mockPort: number) {
        super(mockPort);
    }
}

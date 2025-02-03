export default class FiltersData {
    constructor(private tenantName: string) {
    }

    testFootballStatsFilters = [
        {
            filter: {
                tenant: this.tenantName,
                identifiers: 'isRetired=true'
            },
            expectedValue: 3,
            message: 'There should be 3 retired players; but found '
        },
        {
            filter: {
                tenant: this.tenantName,
                identifiers: 'country!=Netherlands'
            },
            expectedValue: 7,
            message: 'There should be 7 non-Netherlands players; but found '
        },
        {
            filter: {
                tenant: this.tenantName,
                identifiers: 'foot=Left'
            },
            expectedValue: 3,
            message: 'There should be 3 left foot players; but found '
        },
        {
            filter: {
                tenant: this.tenantName,
                identifiers: 'isRetired!=true, foot=Left'
            },
            expectedValue: 1,
            message: 'There should be 1 left foot players who are not retired; but found '
        },
        {
            filter: {
                tenant: this.tenantName,
                identifiers: 'isRetired=true, country=Netherlands'
            },
            expectedValue: 2,
            message: 'There should be 2 retired Netherlands players; but found '
        },
        {
            filter: {
                tenant: this.tenantName,
                identifiers: 'foot!=Right, country=Argentina'
            },
            expectedValue: 1,
            message: 'There should be 1 left foot Argentina players; but found '
        },
        {
            filter: {
                tenant: this.tenantName,
                identifiers: 'isRetired!=true, country=England, foot=Right'
            },
            expectedValue: 1,
            message: 'There should be 1 right foot England player; but found '
        },
        {
            filter: {
                tenant: this.tenantName,
                identifiers: 'isRetired=true, country=Netherlands, country=Germany'
            },
            expectedValue: 3,
            message: 'There should be 3 retired Netherlands and Germany players; but found '
        },
        {
            filter: {
                tenant: this.tenantName,
                identifiers: 'isRetired=true, country=Brazil'
            },
            expectedValue: 0,
            message: 'There should be 0 retired Brazil players; but found '
        },
        {
            filter: {
                tenant: this.tenantName,
                identifiers: 'country="Netherlands"'
            },
            expectedValue: 0,
            message: 'There should be 0 results because of invalid country format "Netherlands"'
        },
        {
            filter: {
                tenant: this.tenantName,
                identifiers: 'isRetired=1, country=Netherlands, country=Germany'
            },
            expectedValue: 0,
            message: 'There should be 0 results because of invalid isRetired format 1'
        },
        {
            filter: {
                tenant: this.tenantName,
                identifiers: 'isWorldCupWinner=true'
            },
            expectedValue: 0,
            message: 'There should be 0 results because of absence of isWorldCupWinner business identifier'
        },
        {
            filter: {
                tenant: this.tenantName,
                identifiers: 'isRetired="False"'
            },
            expectedValue: 0,
            message: 'There should be 0 results because of invalid isRetired format "False"'
        },
        {
            filter: {
                tenant: this.tenantName,
                identifiers: 'country=Brazil&identifiers=isRetired=true'
            },
            expectedValue: 0,
            message: 'This should fail because of invalid identifiers format'
        }    
    ]

    testFootballStatsMultiUserFilters = [
        {
            filter: {
                tenant: this.tenantName,
                identifiers: 'foot=false'
            },
            expectedValue: 1,
            message: 'There should be 1 player with foot as false'
        },
        {
            filter: {
                tenant: this.tenantName,
                identifiers: 'isRetired!=true, country=England, foot=Right'
            },
            expectedValue: 0,
            message: 'There should be no right foot England player; but found '
        },
       {
            filter: {
                tenant: this.tenantName,
                identifiers: 'isRetired=true'
            },
            expectedValue: 2,
            message: 'There should be 2 retired players; but found '
        },
        {
            filter: {
                tenant: this.tenantName,
                identifiers: 'foot!=Right, country=Argentina'
            },
            expectedValue: 1,
            message: 'There should be 1 left foot Argentina player; but found '
        }   
    ]

    testFootballStatsCombinedFilters = [
        {
            filter: {
                tenant: this.tenantName,
                identifiers: 'country=Germany'
            },
            expectedValue: 7,
            message: 'There should be 7 instances of Germany; but found '
        },
        {
            filter: {
                tenant: this.tenantName,
                identifiers: 'name=Robben, country=Spain'
            },
            expectedValue: 1,
            message: 'There should be 1 club that Robben played in Spain; but found '
        },
        {
            filter: {
                tenant: this.tenantName,
                identifiers: 'name=Robben, country=Germany'
            },
            expectedValue: 1,
            message: 'There should be 1 club that Robben played in Germany; but found '
        },
        {
            filter: {
                tenant: this.tenantName,
                identifiers: 'name=Lahm, country=Germany, clubname=Bayern Munich'
            },
            expectedValue: 1,
            message: 'There should be 1 club (Bayern Munich) that Lahm played in Germany; but found '
        },
        {
            filter: {
                tenant: this.tenantName,
                identifiers: 'name=Robben, country=Netherlands, clubname'
            },
            expectedValue: 0,
            message: 'There should be 0 club that Robben played in Netherlands; but found '
        },
        {
            filter: {
                tenant: this.tenantName,
                identifiers: 'name=Messi, country=Argentina, isRetired=false'
            },
            expectedValue: 1,
            message: 'There should be 1 club that Messi played (from Argentina); but found '
        },
        {
            filter: {
                tenant: this.tenantName,
                identifiers: 'name=Messi, country, isRetired=false'
            },
            expectedValue: 1,
            message: 'There should be 1 club that Messi played (from Argentina); but found '
        },
    ]

    testFootballStatsMultiUserCombinedFilters = [
        {
            filter: {
                tenant: this.tenantName,
                identifiers: 'name=Robben, country=Germany'
            },
            expectedValue: 0,
            message: 'There should be 0 club that Robben played in Germany; but found '
        }
    ]
}
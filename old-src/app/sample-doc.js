let Model = require('./model.js');

module.exports = {
    /**
     * サンプルドキュメントの作成。
     * @return {Model.Doc}
     */
    Create: function() {
        let doc = new Model.Doc();

        // 口座
        doc.accountAdd("財布", Model.AccountKind.AssetsCash, 2020);       
        doc.accountAdd("アデリー銀行", Model.AccountKind.AssetsBank, 504000);
        doc.accountAdd("コウテイ銀行", Model.AccountKind.AssetsBank, 12036756);
        doc.accountAdd("PPPカード", Model.AccountKind.LiabilitiesCard, 0);
        doc.accountAdd("キングカード", Model.AccountKind.LiabilitiesCard, 0);

        // 入金
        doc.incomeCategoryAdd("お小遣い", 0);
        doc.incomeRecordAdd(Model.YeadMonthDayDateUtil.FromText('2018-01-02'), "1月分お小遣い", 1, 1, 3000);

        return doc;
    },

    /**
     * テストコードを実行する。
     */
    Test: function() {        
        // Doc -> DocData -> Doc テスト
        if (true) {
            let doc0 = this.Create()
            let doc1 = new Model.Doc();
            let data0 = doc0.exportData();
            doc1.importData(data0);
            let data1 = doc1.exportData();
            if (JSON.stringify(data0) != JSON.stringify(data1)) {
                console.log(JSON.stringify(data0));
                console.log(JSON.stringify(data1));
                throw "Error: Doc to DocData test failed."
            }
            console.log("[Test] Successed.");
        }
    },
};
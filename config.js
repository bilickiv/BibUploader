var digHumElasticConfig = {};
digHumElasticConfig.host = "dighum.bibl.u-szeged.hu";
digHumElasticConfig.port = "8080";
digHumElasticConfig.user = "tamas";
digHumElasticConfig.pw = "53yxUsbQYLRoVy6";

// restricted file do not download in downloadPDF function
digHumElasticConfig.restrictedFileEnable = false;

var localElasticConfig = {};
localElasticConfig.host = "localhost";
localElasticConfig.port = "9200";
localElasticConfig.user = "";
localElasticConfig.pw = "";

// restricted file do not download in downloadPDF function
localElasticConfig.restrictedFileEnable = false;


module.exports = digHumElasticConfig;
//module.exports = localElasticConfig;


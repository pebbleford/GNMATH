function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('GNMATH')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

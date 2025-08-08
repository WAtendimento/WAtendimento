
function extrairContactCardNumber(vcardString) {
  return vcardString?.match(/waid=(\d+)/)?.[1] || null;
}
module.exports = { extrairContactCardNumber };
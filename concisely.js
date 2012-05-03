var inspect = require("util").inspect
var variables = "foo bar baz quux quuux".split(" ")

var input = process.argv.slice(2).join(" ")
var html = require("libxmljs").parseXmlString(require("fs").readFileSync(
  __dirname + "/messages.html"
).toString())

try {
  html.find("//dt").forEach(function (dt) {
    var pattern = normalize(dt.text())
    var match = input.match(new RegExp("^" + pattern + "$"))

    if (match) {
      var definition = normalize(dt.get("following-sibling::dd").text())

      console.log(definition.replace(
        (/\b(foo|bar|baz|quu+x)\b/gi), function (variable) {
          var index = variables.indexOf(variable.toLowerCase()) + 1

          if (index === 0) {
            throw new Error("bad variable: " + inspect(variable))
          } else if (variable === variable.toLowerCase()) {
            return match[index]
          } else if (variable === variable.toUpperCase()) {
            return match[index]
          } else {
            return match[index]
          }
        }
      ))

      throw new BreakError
    }
  })
} catch (error) {
  if (error.type !== "break") {
    throw error
  }
}

function BreakError() {
  this.type = "break"
}

function normalize(text) {
  return text.replace(/\n/g, " ")
    .replace(/^\s+|\s+$/g, "")
    .replace(/\s+/g, " ")
}

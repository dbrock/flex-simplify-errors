var inspect = require("util").inspect

var input = process.argv.slice(2).join(" ")
var html = require("libxmljs").parseXmlString(require("fs").readFileSync(
  __dirname + "/messages.html"
).toString())

html.find("//dt").forEach(function (dt) {
  var dd = dt.get("following-sibling::dd")
  var match = input.match(new RegExp("^" + normalize(dt.text()) + "$"))

  if (match) {
    var definition = dd.find("text()|div").filter(function (node) {
      return /\S/.test(node.text())
    }).map(function (node) {
      return normalize(node.text())
    }).join("\n")

    console.log(evaluate(definition, match))
    process.exit()
  }
})

function evaluate(definition, match) {
  return definition.replace(
    (/\b(?:foo|bar|baz|quu+x)(?:\.as)?\b/gi), function (variable) {
      var index = getFooBarBazIndex(
        variable.replace(/\.as$/, "").toLowerCase()
      ) + 1

      if (index === 0) {
        throw new Error("bad variable: " + inspect(variable))
      } else if (/.as$/.test(variable)) {
        return match[index]
      } else if (variable === variable.toLowerCase()) {
        return match[index]
      } else if (variable === variable.toUpperCase()) {
        return match[index]
      } else {
        return match[index].replace(/:/g, ".")
      }
    }
  ).split("\n").map(function (line) {
    if (/^warning: /.test(line)) {
      return line
    } else {
      return "error: " + line
    }
  }).join("\n")
}

function getFooBarBazIndex(variable) {
  if (variable === "foo") {
    return 0
  } else if (variable === "bar") {
    return 1
  } else if (variable === "baz") {
    return 2
  } else {
    var match = variable.match(/^quu(u*)x$/)

    if (match) {
      return 3 + match[1].length
    } else {
      throw new Error("bad metasyntactic variable: " + variable)
    }
  }
}

function normalize(text) {
  return text.replace(/\n/g, " ")
    .replace(/^\s+|\s+$/g, "")
    .replace(/\s+/g, " ")
}

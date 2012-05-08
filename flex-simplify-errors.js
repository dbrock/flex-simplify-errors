#!/usr/bin/env node

var format = require("util").format
var inspect = require("util").inspect
var messages_html = require("libxmljs").parseXmlString(
  require("fs").readFileSync(
    __dirname + "/flex-error-messages.html"
  ).toString()
)

RegExp.quote = require("regexp-quote")

if (require.main === module) {
  if (process.argv.length === 2) {
    var stdin = []

    process.stdin.resume()
    process.stdin.on("data", function (data) {
      stdin.push(data.toString())
    }).on("end", function () {
      console.log(simplify(stdin.join("")))
    })
  } else {
    console.log(simplify(process.argv.slice(2).join(" ")))
  }
} else {
  module.exports = simplify
}

function simplify(text) {
  return text.replace(/\n$/, "").split("\n").map(simplify_line).join("\n")
}

function simplify_line(message) {
  var filename, line, match

  if ((match = message.match(
    (/^(\/[^(:]+)(?:\((\d+)\))?: (?:col: \d+ )?(.+)$/)
  ))) {
    filename = match[1].replace(
      new RegExp("^" + RegExp.quote(process.cwd() + "/")), ""
    )
    line = match[2]
    message = match[3]
  }

  message = message.replace(/^Error: /, "")
  messages_html.find("//dt").some(function (dt) {
    var dd = dt.get("following-sibling::dd")

    if ((match = message.match(
      new RegExp("^" + normalize(dt.text()) + "\.?$")
    ))) {
      var line_elements = dd.get("div") ? dd.find("div") : [dd]
      var definition = line_elements.map(function (line) {
        return normalize(line.text())
      }).join("\n")

      message = evaluate(definition, match)

      return true
    } else {
      return false
    }
  })

  if (filename && line) {
    message = format("%s:%d: %s", filename, line, message)
  } else if (filename) {
    message = format("%s: %s", filename, message)
  }

  return message
}

function evaluate(definition, match) {
  var filename_pattern = /\.as(:\d+)?$/g

  return definition.replace(
    (/\b(?:foo|bar|baz|quu+x)(?:\.as)?\b/gi), function (variable) {
      var value = match[getFooBarBazIndex(
        variable.replace(filename_pattern, "").toLowerCase()
      ) + 1]

      if (filename_pattern.test(variable)) {
        return filename_value(value)
      } else if (variable === variable.toLowerCase()) {
        return value
      } else if (variable === variable.toUpperCase()) {
        return syntax_token_value(value)
      } else {
        return type_name_value(value)
      }
    }
   ).split("\n").map(function (line) {
    if (/^(warning|flex-compiler): /i.test(line)) {
      return line
    } else {
      return "error: " + line
    }
  }).join("\n")
}

function filename_value(filename) {
  return filename
}

function syntax_token_value(token) {
  return token
}

function type_name_value(name) {
  return name.replace(/:/g, ".")
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
      throw new Error("bad metasyntactic variable: " + inspect(variable))
    }
  }
}

function normalize(text) {
  return text.replace(/\n/g, " ")
    .replace(/^\s+|\s+$/g, "")
    .replace(/\s+/g, " ")
}

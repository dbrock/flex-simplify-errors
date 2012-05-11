#!/usr/bin/env node

var colors = require("colors")
var format = require("util").format
var inspect = require("util").inspect
var path = require("path")

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
      process.stdout.write(simplify(stdin.join("")))
    })
  } else {
    process.stdout.write(simplify(process.argv.slice(2).join(" ")))
  }
} else {
  module.exports = simplify
}

function simplify(text, options) {
  options = options || {}

  var input_lines = text.replace(/\n$/, "").split("\n")
  var output_lines = input_lines.filter(function (line) {
    return /^\S/.test(line)
  }).map(function (line) {
    return simplify_line(line, options)
  })

  return output_lines.length ? output_lines.join("\n") + "\n" : ""
}

function simplify_line(message, options) {
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

  message = message.replace(/\.$/, "")
    .replace(/^ ?Error: /, "")
    .replace(/^Warning: /, "warning: ")

  messages_html.find("//dt").some(function (dt) {
    var dd = dt.get("following-sibling::dd")

    if ((match = message.match(
      new RegExp("^" + normalize(dt.text()) + "$", "i")
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

  if (options.colors) {
    filename = filename && path.join(
      colors.grey(path.dirname(filename)),
      colors.bold(path.basename(filename))
    )

    message = message.replace(/^(?:warning|error): /i, function (match) {
      return colors.bold(colors.red(match))
    })
  }

  if (filename && line) {
    message = format("%s:%d: %s", filename, line, message)
  } else if (filename) {
    message = format("%s:0: %s", filename, message)
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
     if (/^(warning|flex-compiler): /.test(line)) {
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

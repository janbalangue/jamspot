const Module = require("node:module");
const React = require("react");

const originalLoad = Module._load;

Module._load = function load(request, parent, isMain) {
  if (request === "next/image") {
    const NextImageStub = ({ fill, priority, loader, quality, ...props }) =>
      React.createElement("img", props);

    return { __esModule: true, default: NextImageStub };
  }

  return originalLoad.call(this, request, parent, isMain);
};

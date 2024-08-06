(() => {
  // packages/alpinejs/src/scheduler.js
  var flushPending = false;
  var flushing = false;
  var queue = [];
  var lastFlushedIndex = -1;
  function scheduler(callback) {
    queueJob(callback);
  }
  function queueJob(job) {
    if (!queue.includes(job))
      queue.push(job);
    queueFlush();
  }
  function dequeueJob(job) {
    let index = queue.indexOf(job);
    if (index !== -1 && index > lastFlushedIndex)
      queue.splice(index, 1);
  }
  function queueFlush() {
    if (!flushing && !flushPending) {
      flushPending = true;
      queueMicrotask(flushJobs);
    }
  }
  function flushJobs() {
    flushPending = false;
    flushing = true;
    for (let i = 0; i < queue.length; i++) {
      queue[i]();
      lastFlushedIndex = i;
    }
    queue.length = 0;
    lastFlushedIndex = -1;
    flushing = false;
  }

  // packages/alpinejs/src/reactivity.js
  var reactive;
  var effect;
  var release;
  var raw;
  var shouldSchedule = true;
  function disableEffectScheduling(callback) {
    shouldSchedule = false;
    callback();
    shouldSchedule = true;
  }
  function setReactivityEngine(engine) {
    reactive = engine.reactive;
    release = engine.release;
    effect = (callback) => engine.effect(callback, { scheduler: (task) => {
      if (shouldSchedule) {
        scheduler(task);
      } else {
        task();
      }
    } });
    raw = engine.raw;
  }
  function overrideEffect(override) {
    effect = override;
  }
  function elementBoundEffect(el) {
    let cleanup2 = () => {
    };
    let wrappedEffect = (callback) => {
      let effectReference = effect(callback);
      if (!el._x_effects) {
        el._x_effects = /* @__PURE__ */ new Set();
        el._x_runEffects = () => {
          el._x_effects.forEach((i) => i());
        };
      }
      el._x_effects.add(effectReference);
      cleanup2 = () => {
        if (effectReference === void 0)
          return;
        el._x_effects.delete(effectReference);
        release(effectReference);
      };
      return effectReference;
    };
    return [wrappedEffect, () => {
      cleanup2();
    }];
  }
  function watch(getter, callback) {
    let firstTime = true;
    let oldValue;
    let effectReference = effect(() => {
      let value = getter();
      JSON.stringify(value);
      if (!firstTime) {
        queueMicrotask(() => {
          callback(value, oldValue);
          oldValue = value;
        });
      } else {
        oldValue = value;
      }
      firstTime = false;
    });
    return () => release(effectReference);
  }

  // packages/alpinejs/src/mutation.js
  var onAttributeAddeds = [];
  var onElRemoveds = [];
  var onElAddeds = [];
  function onElAdded(callback) {
    onElAddeds.push(callback);
  }
  function onElRemoved(el, callback) {
    if (typeof callback === "function") {
      if (!el._x_cleanups)
        el._x_cleanups = [];
      el._x_cleanups.push(callback);
    } else {
      callback = el;
      onElRemoveds.push(callback);
    }
  }
  function onAttributesAdded(callback) {
    onAttributeAddeds.push(callback);
  }
  function onAttributeRemoved(el, name, callback) {
    if (!el._x_attributeCleanups)
      el._x_attributeCleanups = {};
    if (!el._x_attributeCleanups[name])
      el._x_attributeCleanups[name] = [];
    el._x_attributeCleanups[name].push(callback);
  }
  function cleanupAttributes(el, names) {
    if (!el._x_attributeCleanups)
      return;
    Object.entries(el._x_attributeCleanups).forEach(([name, value]) => {
      if (names === void 0 || names.includes(name)) {
        value.forEach((i) => i());
        delete el._x_attributeCleanups[name];
      }
    });
  }
  function cleanupElement(el) {
    if (el._x_cleanups) {
      while (el._x_cleanups.length)
        el._x_cleanups.pop()();
    }
  }
  var observer = new MutationObserver(onMutate);
  var currentlyObserving = false;
  function startObservingMutations() {
    observer.observe(document, { subtree: true, childList: true, attributes: true, attributeOldValue: true });
    currentlyObserving = true;
  }
  function stopObservingMutations() {
    flushObserver();
    observer.disconnect();
    currentlyObserving = false;
  }
  var queuedMutations = [];
  function flushObserver() {
    let records = observer.takeRecords();
    queuedMutations.push(() => records.length > 0 && onMutate(records));
    let queueLengthWhenTriggered = queuedMutations.length;
    queueMicrotask(() => {
      if (queuedMutations.length === queueLengthWhenTriggered) {
        while (queuedMutations.length > 0)
          queuedMutations.shift()();
      }
    });
  }
  function mutateDom(callback) {
    if (!currentlyObserving)
      return callback();
    stopObservingMutations();
    let result = callback();
    startObservingMutations();
    return result;
  }
  var isCollecting = false;
  var deferredMutations = [];
  function deferMutations() {
    isCollecting = true;
  }
  function flushAndStopDeferringMutations() {
    isCollecting = false;
    onMutate(deferredMutations);
    deferredMutations = [];
  }
  function onMutate(mutations) {
    if (isCollecting) {
      deferredMutations = deferredMutations.concat(mutations);
      return;
    }
    let addedNodes = /* @__PURE__ */ new Set();
    let removedNodes = /* @__PURE__ */ new Set();
    let addedAttributes = /* @__PURE__ */ new Map();
    let removedAttributes = /* @__PURE__ */ new Map();
    for (let i = 0; i < mutations.length; i++) {
      if (mutations[i].target._x_ignoreMutationObserver)
        continue;
      if (mutations[i].type === "childList") {
        mutations[i].addedNodes.forEach((node) => node.nodeType === 1 && addedNodes.add(node));
        mutations[i].removedNodes.forEach((node) => node.nodeType === 1 && removedNodes.add(node));
      }
      if (mutations[i].type === "attributes") {
        let el = mutations[i].target;
        let name = mutations[i].attributeName;
        let oldValue = mutations[i].oldValue;
        let add2 = () => {
          if (!addedAttributes.has(el))
            addedAttributes.set(el, []);
          addedAttributes.get(el).push({ name, value: el.getAttribute(name) });
        };
        let remove = () => {
          if (!removedAttributes.has(el))
            removedAttributes.set(el, []);
          removedAttributes.get(el).push(name);
        };
        if (el.hasAttribute(name) && oldValue === null) {
          add2();
        } else if (el.hasAttribute(name)) {
          remove();
          add2();
        } else {
          remove();
        }
      }
    }
    removedAttributes.forEach((attrs, el) => {
      cleanupAttributes(el, attrs);
    });
    addedAttributes.forEach((attrs, el) => {
      onAttributeAddeds.forEach((i) => i(el, attrs));
    });
    for (let node of removedNodes) {
      if (addedNodes.has(node))
        continue;
      onElRemoveds.forEach((i) => i(node));
    }
    addedNodes.forEach((node) => {
      node._x_ignoreSelf = true;
      node._x_ignore = true;
    });
    for (let node of addedNodes) {
      if (removedNodes.has(node))
        continue;
      if (!node.isConnected)
        continue;
      delete node._x_ignoreSelf;
      delete node._x_ignore;
      onElAddeds.forEach((i) => i(node));
      node._x_ignore = true;
      node._x_ignoreSelf = true;
    }
    addedNodes.forEach((node) => {
      delete node._x_ignoreSelf;
      delete node._x_ignore;
    });
    addedNodes = null;
    removedNodes = null;
    addedAttributes = null;
    removedAttributes = null;
  }

  // packages/alpinejs/src/scope.js
  function scope(node) {
    return mergeProxies(closestDataStack(node));
  }
  function addScopeToNode(node, data2, referenceNode) {
    node._x_dataStack = [data2, ...closestDataStack(referenceNode || node)];
    return () => {
      node._x_dataStack = node._x_dataStack.filter((i) => i !== data2);
    };
  }
  function closestDataStack(node) {
    if (node._x_dataStack)
      return node._x_dataStack;
    if (typeof ShadowRoot === "function" && node instanceof ShadowRoot) {
      return closestDataStack(node.host);
    }
    if (!node.parentNode) {
      return [];
    }
    return closestDataStack(node.parentNode);
  }
  function mergeProxies(objects) {
    return new Proxy({ objects }, mergeProxyTrap);
  }
  var mergeProxyTrap = {
    ownKeys({ objects }) {
      return Array.from(
        new Set(objects.flatMap((i) => Object.keys(i)))
      );
    },
    has({ objects }, name) {
      if (name == Symbol.unscopables)
        return false;
      return objects.some(
        (obj) => Object.prototype.hasOwnProperty.call(obj, name) || Reflect.has(obj, name)
      );
    },
    get({ objects }, name, thisProxy) {
      if (name == "toJSON")
        return collapseProxies;
      return Reflect.get(
        objects.find(
          (obj) => Reflect.has(obj, name)
        ) || {},
        name,
        thisProxy
      );
    },
    set({ objects }, name, value, thisProxy) {
      const target = objects.find(
        (obj) => Object.prototype.hasOwnProperty.call(obj, name)
      ) || objects[objects.length - 1];
      const descriptor = Object.getOwnPropertyDescriptor(target, name);
      if (descriptor?.set && descriptor?.get)
        return descriptor.set.call(thisProxy, value) || true;
      return Reflect.set(target, name, value);
    }
  };
  function collapseProxies() {
    let keys = Reflect.ownKeys(this);
    return keys.reduce((acc, key) => {
      acc[key] = Reflect.get(this, key);
      return acc;
    }, {});
  }

  // packages/alpinejs/src/interceptor.js
  function initInterceptors(data2) {
    let isObject2 = (val) => typeof val === "object" && !Array.isArray(val) && val !== null;
    let recurse = (obj, basePath = "") => {
      Object.entries(Object.getOwnPropertyDescriptors(obj)).forEach(([key, { value, enumerable }]) => {
        if (enumerable === false || value === void 0)
          return;
        if (typeof value === "object" && value !== null && value.__v_skip)
          return;
        let path = basePath === "" ? key : `${basePath}.${key}`;
        if (typeof value === "object" && value !== null && value._x_interceptor) {
          obj[key] = value.initialize(data2, path, key);
        } else {
          if (isObject2(value) && value !== obj && !(value instanceof Element)) {
            recurse(value, path);
          }
        }
      });
    };
    return recurse(data2);
  }
  function interceptor(callback, mutateObj = () => {
  }) {
    let obj = {
      initialValue: void 0,
      _x_interceptor: true,
      initialize(data2, path, key) {
        return callback(this.initialValue, () => get(data2, path), (value) => set(data2, path, value), path, key);
      }
    };
    mutateObj(obj);
    return (initialValue) => {
      if (typeof initialValue === "object" && initialValue !== null && initialValue._x_interceptor) {
        let initialize = obj.initialize.bind(obj);
        obj.initialize = (data2, path, key) => {
          let innerValue = initialValue.initialize(data2, path, key);
          obj.initialValue = innerValue;
          return initialize(data2, path, key);
        };
      } else {
        obj.initialValue = initialValue;
      }
      return obj;
    };
  }
  function get(obj, path) {
    return path.split(".").reduce((carry, segment) => carry[segment], obj);
  }
  function set(obj, path, value) {
    if (typeof path === "string")
      path = path.split(".");
    if (path.length === 1)
      obj[path[0]] = value;
    else if (path.length === 0)
      throw error;
    else {
      if (obj[path[0]])
        return set(obj[path[0]], path.slice(1), value);
      else {
        obj[path[0]] = {};
        return set(obj[path[0]], path.slice(1), value);
      }
    }
  }

  // packages/alpinejs/src/magics.js
  var magics = {};
  function magic(name, callback) {
    magics[name] = callback;
  }
  function injectMagics(obj, el) {
    Object.entries(magics).forEach(([name, callback]) => {
      let memoizedUtilities = null;
      function getUtilities() {
        if (memoizedUtilities) {
          return memoizedUtilities;
        } else {
          let [utilities, cleanup2] = getElementBoundUtilities(el);
          memoizedUtilities = { interceptor, ...utilities };
          onElRemoved(el, cleanup2);
          return memoizedUtilities;
        }
      }
      Object.defineProperty(obj, `$${name}`, {
        get() {
          return callback(el, getUtilities());
        },
        enumerable: false
      });
    });
    return obj;
  }

  // packages/alpinejs/src/utils/error.js
  function tryCatch(el, expression, callback, ...args) {
    try {
      return callback(...args);
    } catch (e) {
      handleError(e, el, expression);
    }
  }
  function handleError(error2, el, expression = void 0) {
    error2 = Object.assign(
      error2 ?? { message: "No error message given." },
      { el, expression }
    );
    console.warn(`Alpine Expression Error: ${error2.message}

${expression ? 'Expression: "' + expression + '"\n\n' : ""}`, el);
    setTimeout(() => {
      throw error2;
    }, 0);
  }

  // packages/alpinejs/src/evaluator.js
  var shouldAutoEvaluateFunctions = true;
  function dontAutoEvaluateFunctions(callback) {
    let cache = shouldAutoEvaluateFunctions;
    shouldAutoEvaluateFunctions = false;
    let result = callback();
    shouldAutoEvaluateFunctions = cache;
    return result;
  }
  function evaluate(el, expression, extras = {}) {
    let result;
    evaluateLater(el, expression)((value) => result = value, extras);
    return result;
  }
  function evaluateLater(...args) {
    return theEvaluatorFunction(...args);
  }
  var theEvaluatorFunction = normalEvaluator;
  function setEvaluator(newEvaluator) {
    theEvaluatorFunction = newEvaluator;
  }
  function normalEvaluator(el, expression) {
    let overriddenMagics = {};
    injectMagics(overriddenMagics, el);
    let dataStack = [overriddenMagics, ...closestDataStack(el)];
    let evaluator = typeof expression === "function" ? generateEvaluatorFromFunction(dataStack, expression) : generateEvaluatorFromString(dataStack, expression, el);
    return tryCatch.bind(null, el, expression, evaluator);
  }
  function generateEvaluatorFromFunction(dataStack, func) {
    return (receiver = () => {
    }, { scope: scope2 = {}, params = [] } = {}) => {
      let result = func.apply(mergeProxies([scope2, ...dataStack]), params);
      runIfTypeOfFunction(receiver, result);
    };
  }
  var evaluatorMemo = {};
  function generateFunctionFromString(expression, el) {
    if (evaluatorMemo[expression]) {
      return evaluatorMemo[expression];
    }
    let AsyncFunction = Object.getPrototypeOf(async function() {
    }).constructor;
    let rightSideSafeExpression = /^[\n\s]*if.*\(.*\)/.test(expression.trim()) || /^(let|const)\s/.test(expression.trim()) ? `(async()=>{ ${expression} })()` : expression;
    const safeAsyncFunction = () => {
      try {
        let func2 = new AsyncFunction(
          ["__self", "scope"],
          `with (scope) { __self.result = ${rightSideSafeExpression} }; __self.finished = true; return __self.result;`
        );
        Object.defineProperty(func2, "name", {
          value: `[Alpine] ${expression}`
        });
        return func2;
      } catch (error2) {
        handleError(error2, el, expression);
        return Promise.resolve();
      }
    };
    let func = safeAsyncFunction();
    evaluatorMemo[expression] = func;
    return func;
  }
  function generateEvaluatorFromString(dataStack, expression, el) {
    let func = generateFunctionFromString(expression, el);
    return (receiver = () => {
    }, { scope: scope2 = {}, params = [] } = {}) => {
      func.result = void 0;
      func.finished = false;
      let completeScope = mergeProxies([scope2, ...dataStack]);
      if (typeof func === "function") {
        let promise = func(func, completeScope).catch((error2) => handleError(error2, el, expression));
        if (func.finished) {
          runIfTypeOfFunction(receiver, func.result, completeScope, params, el);
          func.result = void 0;
        } else {
          promise.then((result) => {
            runIfTypeOfFunction(receiver, result, completeScope, params, el);
          }).catch((error2) => handleError(error2, el, expression)).finally(() => func.result = void 0);
        }
      }
    };
  }
  function runIfTypeOfFunction(receiver, value, scope2, params, el) {
    if (shouldAutoEvaluateFunctions && typeof value === "function") {
      let result = value.apply(scope2, params);
      if (result instanceof Promise) {
        result.then((i) => runIfTypeOfFunction(receiver, i, scope2, params)).catch((error2) => handleError(error2, el, value));
      } else {
        receiver(result);
      }
    } else if (typeof value === "object" && value instanceof Promise) {
      value.then((i) => receiver(i));
    } else {
      receiver(value);
    }
  }

  // packages/alpinejs/src/directives.js
  var prefixAsString = "x-";
  function prefix(subject = "") {
    return prefixAsString + subject;
  }
  function setPrefix(newPrefix) {
    prefixAsString = newPrefix;
  }
  var directiveHandlers = {};
  function directive(name, callback) {
    directiveHandlers[name] = callback;
    return {
      before(directive2) {
        if (!directiveHandlers[directive2]) {
          console.warn(String.raw`Cannot find directive \`${directive2}\`. \`${name}\` will use the default order of execution`);
          return;
        }
        const pos = directiveOrder.indexOf(directive2);
        directiveOrder.splice(pos >= 0 ? pos : directiveOrder.indexOf("DEFAULT"), 0, name);
      }
    };
  }
  function directiveExists(name) {
    return Object.keys(directiveHandlers).includes(name);
  }
  function directives(el, attributes, originalAttributeOverride) {
    attributes = Array.from(attributes);
    if (el._x_virtualDirectives) {
      let vAttributes = Object.entries(el._x_virtualDirectives).map(([name, value]) => ({ name, value }));
      let staticAttributes = attributesOnly(vAttributes);
      vAttributes = vAttributes.map((attribute) => {
        if (staticAttributes.find((attr) => attr.name === attribute.name)) {
          return {
            name: `x-bind:${attribute.name}`,
            value: `"${attribute.value}"`
          };
        }
        return attribute;
      });
      attributes = attributes.concat(vAttributes);
    }
    let transformedAttributeMap = {};
    let directives2 = attributes.map(toTransformedAttributes((newName, oldName) => transformedAttributeMap[newName] = oldName)).filter(outNonAlpineAttributes).map(toParsedDirectives(transformedAttributeMap, originalAttributeOverride)).sort(byPriority);
    return directives2.map((directive2) => {
      return getDirectiveHandler(el, directive2);
    });
  }
  function attributesOnly(attributes) {
    return Array.from(attributes).map(toTransformedAttributes()).filter((attr) => !outNonAlpineAttributes(attr));
  }
  var isDeferringHandlers = false;
  var directiveHandlerStacks = /* @__PURE__ */ new Map();
  var currentHandlerStackKey = Symbol();
  function deferHandlingDirectives(callback) {
    isDeferringHandlers = true;
    let key = Symbol();
    currentHandlerStackKey = key;
    directiveHandlerStacks.set(key, []);
    let flushHandlers = () => {
      while (directiveHandlerStacks.get(key).length)
        directiveHandlerStacks.get(key).shift()();
      directiveHandlerStacks.delete(key);
    };
    let stopDeferring = () => {
      isDeferringHandlers = false;
      flushHandlers();
    };
    callback(flushHandlers);
    stopDeferring();
  }
  function getElementBoundUtilities(el) {
    let cleanups = [];
    let cleanup2 = (callback) => cleanups.push(callback);
    let [effect3, cleanupEffect] = elementBoundEffect(el);
    cleanups.push(cleanupEffect);
    let utilities = {
      Alpine: alpine_default,
      effect: effect3,
      cleanup: cleanup2,
      evaluateLater: evaluateLater.bind(evaluateLater, el),
      evaluate: evaluate.bind(evaluate, el)
    };
    let doCleanup = () => cleanups.forEach((i) => i());
    return [utilities, doCleanup];
  }
  function getDirectiveHandler(el, directive2) {
    let noop = () => {
    };
    let handler4 = directiveHandlers[directive2.type] || noop;
    let [utilities, cleanup2] = getElementBoundUtilities(el);
    onAttributeRemoved(el, directive2.original, cleanup2);
    let fullHandler = () => {
      if (el._x_ignore || el._x_ignoreSelf)
        return;
      handler4.inline && handler4.inline(el, directive2, utilities);
      handler4 = handler4.bind(handler4, el, directive2, utilities);
      isDeferringHandlers ? directiveHandlerStacks.get(currentHandlerStackKey).push(handler4) : handler4();
    };
    fullHandler.runCleanups = cleanup2;
    return fullHandler;
  }
  var startingWith = (subject, replacement) => ({ name, value }) => {
    if (name.startsWith(subject))
      name = name.replace(subject, replacement);
    return { name, value };
  };
  var into = (i) => i;
  function toTransformedAttributes(callback = () => {
  }) {
    return ({ name, value }) => {
      let { name: newName, value: newValue } = attributeTransformers.reduce((carry, transform) => {
        return transform(carry);
      }, { name, value });
      if (newName !== name)
        callback(newName, name);
      return { name: newName, value: newValue };
    };
  }
  var attributeTransformers = [];
  function mapAttributes(callback) {
    attributeTransformers.push(callback);
  }
  function outNonAlpineAttributes({ name }) {
    return alpineAttributeRegex().test(name);
  }
  var alpineAttributeRegex = () => new RegExp(`^${prefixAsString}([^:^.]+)\\b`);
  function toParsedDirectives(transformedAttributeMap, originalAttributeOverride) {
    return ({ name, value }) => {
      let typeMatch = name.match(alpineAttributeRegex());
      let valueMatch = name.match(/:([a-zA-Z0-9\-_:]+)/);
      let modifiers = name.match(/\.[^.\]]+(?=[^\]]*$)/g) || [];
      let original = originalAttributeOverride || transformedAttributeMap[name] || name;
      return {
        type: typeMatch ? typeMatch[1] : null,
        value: valueMatch ? valueMatch[1] : null,
        modifiers: modifiers.map((i) => i.replace(".", "")),
        expression: value,
        original
      };
    };
  }
  var DEFAULT = "DEFAULT";
  var directiveOrder = [
    "ignore",
    "ref",
    "data",
    "id",
    "anchor",
    "bind",
    "init",
    "for",
    "model",
    "modelable",
    "transition",
    "show",
    "if",
    DEFAULT,
    "teleport"
  ];
  function byPriority(a, b) {
    let typeA = directiveOrder.indexOf(a.type) === -1 ? DEFAULT : a.type;
    let typeB = directiveOrder.indexOf(b.type) === -1 ? DEFAULT : b.type;
    return directiveOrder.indexOf(typeA) - directiveOrder.indexOf(typeB);
  }

  // packages/alpinejs/src/utils/dispatch.js
  function dispatch(el, name, detail = {}) {
    el.dispatchEvent(
      new CustomEvent(name, {
        detail,
        bubbles: true,
        // Allows events to pass the shadow DOM barrier.
        composed: true,
        cancelable: true
      })
    );
  }

  // packages/alpinejs/src/utils/walk.js
  function walk(el, callback) {
    if (typeof ShadowRoot === "function" && el instanceof ShadowRoot) {
      Array.from(el.children).forEach((el2) => walk(el2, callback));
      return;
    }
    let skip = false;
    callback(el, () => skip = true);
    if (skip)
      return;
    let node = el.firstElementChild;
    while (node) {
      walk(node, callback, false);
      node = node.nextElementSibling;
    }
  }

  // packages/alpinejs/src/utils/warn.js
  function warn(message, ...args) {
    console.warn(`Alpine Warning: ${message}`, ...args);
  }

  // packages/alpinejs/src/lifecycle.js
  var started = false;
  function start() {
    if (started)
      warn("Alpine has already been initialized on this page. Calling Alpine.start() more than once can cause problems.");
    started = true;
    if (!document.body)
      warn("Unable to initialize. Trying to load Alpine before `<body>` is available. Did you forget to add `defer` in Alpine's `<script>` tag?");
    dispatch(document, "alpine:init");
    dispatch(document, "alpine:initializing");
    startObservingMutations();
    onElAdded((el) => initTree(el, walk));
    onElRemoved((el) => destroyTree(el));
    onAttributesAdded((el, attrs) => {
      directives(el, attrs).forEach((handle) => handle());
    });
    let outNestedComponents = (el) => !closestRoot(el.parentElement, true);
    Array.from(document.querySelectorAll(allSelectors().join(","))).filter(outNestedComponents).forEach((el) => {
      initTree(el);
    });
    dispatch(document, "alpine:initialized");
    setTimeout(() => {
      warnAboutMissingPlugins();
    });
  }
  var rootSelectorCallbacks = [];
  var initSelectorCallbacks = [];
  function rootSelectors() {
    return rootSelectorCallbacks.map((fn) => fn());
  }
  function allSelectors() {
    return rootSelectorCallbacks.concat(initSelectorCallbacks).map((fn) => fn());
  }
  function addRootSelector(selectorCallback) {
    rootSelectorCallbacks.push(selectorCallback);
  }
  function addInitSelector(selectorCallback) {
    initSelectorCallbacks.push(selectorCallback);
  }
  function closestRoot(el, includeInitSelectors = false) {
    return findClosest(el, (element) => {
      const selectors = includeInitSelectors ? allSelectors() : rootSelectors();
      if (selectors.some((selector) => element.matches(selector)))
        return true;
    });
  }
  function findClosest(el, callback) {
    if (!el)
      return;
    if (callback(el))
      return el;
    if (el._x_teleportBack)
      el = el._x_teleportBack;
    if (!el.parentElement)
      return;
    return findClosest(el.parentElement, callback);
  }
  function isRoot(el) {
    return rootSelectors().some((selector) => el.matches(selector));
  }
  var initInterceptors2 = [];
  function interceptInit(callback) {
    initInterceptors2.push(callback);
  }
  function initTree(el, walker = walk, intercept = () => {
  }) {
    deferHandlingDirectives(() => {
      walker(el, (el2, skip) => {
        intercept(el2, skip);
        initInterceptors2.forEach((i) => i(el2, skip));
        directives(el2, el2.attributes).forEach((handle) => handle());
        el2._x_ignore && skip();
      });
    });
  }
  function destroyTree(root, walker = walk) {
    walker(root, (el) => {
      cleanupAttributes(el);
      cleanupElement(el);
    });
  }
  function warnAboutMissingPlugins() {
    let pluginDirectives = [
      ["ui", "dialog", ["[x-dialog], [x-popover]"]],
      ["anchor", "anchor", ["[x-anchor]"]],
      ["sort", "sort", ["[x-sort]"]]
    ];
    pluginDirectives.forEach(([plugin2, directive2, selectors]) => {
      if (directiveExists(directive2))
        return;
      selectors.some((selector) => {
        if (document.querySelector(selector)) {
          warn(`found "${selector}", but missing ${plugin2} plugin`);
          return true;
        }
      });
    });
  }

  // packages/alpinejs/src/nextTick.js
  var tickStack = [];
  var isHolding = false;
  function nextTick(callback = () => {
  }) {
    queueMicrotask(() => {
      isHolding || setTimeout(() => {
        releaseNextTicks();
      });
    });
    return new Promise((res) => {
      tickStack.push(() => {
        callback();
        res();
      });
    });
  }
  function releaseNextTicks() {
    isHolding = false;
    while (tickStack.length)
      tickStack.shift()();
  }
  function holdNextTicks() {
    isHolding = true;
  }

  // packages/alpinejs/src/utils/classes.js
  function setClasses(el, value) {
    if (Array.isArray(value)) {
      return setClassesFromString(el, value.join(" "));
    } else if (typeof value === "object" && value !== null) {
      return setClassesFromObject(el, value);
    } else if (typeof value === "function") {
      return setClasses(el, value());
    }
    return setClassesFromString(el, value);
  }
  function setClassesFromString(el, classString) {
    let split = (classString2) => classString2.split(" ").filter(Boolean);
    let missingClasses = (classString2) => classString2.split(" ").filter((i) => !el.classList.contains(i)).filter(Boolean);
    let addClassesAndReturnUndo = (classes) => {
      el.classList.add(...classes);
      return () => {
        el.classList.remove(...classes);
      };
    };
    classString = classString === true ? classString = "" : classString || "";
    return addClassesAndReturnUndo(missingClasses(classString));
  }
  function setClassesFromObject(el, classObject) {
    let split = (classString) => classString.split(" ").filter(Boolean);
    let forAdd = Object.entries(classObject).flatMap(([classString, bool]) => bool ? split(classString) : false).filter(Boolean);
    let forRemove = Object.entries(classObject).flatMap(([classString, bool]) => !bool ? split(classString) : false).filter(Boolean);
    let added = [];
    let removed = [];
    forRemove.forEach((i) => {
      if (el.classList.contains(i)) {
        el.classList.remove(i);
        removed.push(i);
      }
    });
    forAdd.forEach((i) => {
      if (!el.classList.contains(i)) {
        el.classList.add(i);
        added.push(i);
      }
    });
    return () => {
      removed.forEach((i) => el.classList.add(i));
      added.forEach((i) => el.classList.remove(i));
    };
  }

  // packages/alpinejs/src/utils/styles.js
  function setStyles(el, value) {
    if (typeof value === "object" && value !== null) {
      return setStylesFromObject(el, value);
    }
    return setStylesFromString(el, value);
  }
  function setStylesFromObject(el, value) {
    let previousStyles = {};
    Object.entries(value).forEach(([key, value2]) => {
      previousStyles[key] = el.style[key];
      if (!key.startsWith("--")) {
        key = kebabCase(key);
      }
      el.style.setProperty(key, value2);
    });
    setTimeout(() => {
      if (el.style.length === 0) {
        el.removeAttribute("style");
      }
    });
    return () => {
      setStyles(el, previousStyles);
    };
  }
  function setStylesFromString(el, value) {
    let cache = el.getAttribute("style", value);
    el.setAttribute("style", value);
    return () => {
      el.setAttribute("style", cache || "");
    };
  }
  function kebabCase(subject) {
    return subject.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  }

  // packages/alpinejs/src/utils/once.js
  function once(callback, fallback = () => {
  }) {
    let called = false;
    return function() {
      if (!called) {
        called = true;
        callback.apply(this, arguments);
      } else {
        fallback.apply(this, arguments);
      }
    };
  }

  // packages/alpinejs/src/directives/x-transition.js
  directive("transition", (el, { value, modifiers, expression }, { evaluate: evaluate2 }) => {
    if (typeof expression === "function")
      expression = evaluate2(expression);
    if (expression === false)
      return;
    if (!expression || typeof expression === "boolean") {
      registerTransitionsFromHelper(el, modifiers, value);
    } else {
      registerTransitionsFromClassString(el, expression, value);
    }
  });
  function registerTransitionsFromClassString(el, classString, stage) {
    registerTransitionObject(el, setClasses, "");
    let directiveStorageMap = {
      "enter": (classes) => {
        el._x_transition.enter.during = classes;
      },
      "enter-start": (classes) => {
        el._x_transition.enter.start = classes;
      },
      "enter-end": (classes) => {
        el._x_transition.enter.end = classes;
      },
      "leave": (classes) => {
        el._x_transition.leave.during = classes;
      },
      "leave-start": (classes) => {
        el._x_transition.leave.start = classes;
      },
      "leave-end": (classes) => {
        el._x_transition.leave.end = classes;
      }
    };
    directiveStorageMap[stage](classString);
  }
  function registerTransitionsFromHelper(el, modifiers, stage) {
    registerTransitionObject(el, setStyles);
    let doesntSpecify = !modifiers.includes("in") && !modifiers.includes("out") && !stage;
    let transitioningIn = doesntSpecify || modifiers.includes("in") || ["enter"].includes(stage);
    let transitioningOut = doesntSpecify || modifiers.includes("out") || ["leave"].includes(stage);
    if (modifiers.includes("in") && !doesntSpecify) {
      modifiers = modifiers.filter((i, index) => index < modifiers.indexOf("out"));
    }
    if (modifiers.includes("out") && !doesntSpecify) {
      modifiers = modifiers.filter((i, index) => index > modifiers.indexOf("out"));
    }
    let wantsAll = !modifiers.includes("opacity") && !modifiers.includes("scale");
    let wantsOpacity = wantsAll || modifiers.includes("opacity");
    let wantsScale = wantsAll || modifiers.includes("scale");
    let opacityValue = wantsOpacity ? 0 : 1;
    let scaleValue = wantsScale ? modifierValue(modifiers, "scale", 95) / 100 : 1;
    let delay = modifierValue(modifiers, "delay", 0) / 1e3;
    let origin = modifierValue(modifiers, "origin", "center");
    let property = "opacity, transform";
    let durationIn = modifierValue(modifiers, "duration", 150) / 1e3;
    let durationOut = modifierValue(modifiers, "duration", 75) / 1e3;
    let easing = `cubic-bezier(0.4, 0.0, 0.2, 1)`;
    if (transitioningIn) {
      el._x_transition.enter.during = {
        transformOrigin: origin,
        transitionDelay: `${delay}s`,
        transitionProperty: property,
        transitionDuration: `${durationIn}s`,
        transitionTimingFunction: easing
      };
      el._x_transition.enter.start = {
        opacity: opacityValue,
        transform: `scale(${scaleValue})`
      };
      el._x_transition.enter.end = {
        opacity: 1,
        transform: `scale(1)`
      };
    }
    if (transitioningOut) {
      el._x_transition.leave.during = {
        transformOrigin: origin,
        transitionDelay: `${delay}s`,
        transitionProperty: property,
        transitionDuration: `${durationOut}s`,
        transitionTimingFunction: easing
      };
      el._x_transition.leave.start = {
        opacity: 1,
        transform: `scale(1)`
      };
      el._x_transition.leave.end = {
        opacity: opacityValue,
        transform: `scale(${scaleValue})`
      };
    }
  }
  function registerTransitionObject(el, setFunction, defaultValue = {}) {
    if (!el._x_transition)
      el._x_transition = {
        enter: { during: defaultValue, start: defaultValue, end: defaultValue },
        leave: { during: defaultValue, start: defaultValue, end: defaultValue },
        in(before = () => {
        }, after = () => {
        }) {
          transition(el, setFunction, {
            during: this.enter.during,
            start: this.enter.start,
            end: this.enter.end
          }, before, after);
        },
        out(before = () => {
        }, after = () => {
        }) {
          transition(el, setFunction, {
            during: this.leave.during,
            start: this.leave.start,
            end: this.leave.end
          }, before, after);
        }
      };
  }
  window.Element.prototype._x_toggleAndCascadeWithTransitions = function(el, value, show, hide) {
    const nextTick2 = document.visibilityState === "visible" ? requestAnimationFrame : setTimeout;
    let clickAwayCompatibleShow = () => nextTick2(show);
    if (value) {
      if (el._x_transition && (el._x_transition.enter || el._x_transition.leave)) {
        el._x_transition.enter && (Object.entries(el._x_transition.enter.during).length || Object.entries(el._x_transition.enter.start).length || Object.entries(el._x_transition.enter.end).length) ? el._x_transition.in(show) : clickAwayCompatibleShow();
      } else {
        el._x_transition ? el._x_transition.in(show) : clickAwayCompatibleShow();
      }
      return;
    }
    el._x_hidePromise = el._x_transition ? new Promise((resolve, reject) => {
      el._x_transition.out(() => {
      }, () => resolve(hide));
      el._x_transitioning && el._x_transitioning.beforeCancel(() => reject({ isFromCancelledTransition: true }));
    }) : Promise.resolve(hide);
    queueMicrotask(() => {
      let closest = closestHide(el);
      if (closest) {
        if (!closest._x_hideChildren)
          closest._x_hideChildren = [];
        closest._x_hideChildren.push(el);
      } else {
        nextTick2(() => {
          let hideAfterChildren = (el2) => {
            let carry = Promise.all([
              el2._x_hidePromise,
              ...(el2._x_hideChildren || []).map(hideAfterChildren)
            ]).then(([i]) => i?.());
            delete el2._x_hidePromise;
            delete el2._x_hideChildren;
            return carry;
          };
          hideAfterChildren(el).catch((e) => {
            if (!e.isFromCancelledTransition)
              throw e;
          });
        });
      }
    });
  };
  function closestHide(el) {
    let parent = el.parentNode;
    if (!parent)
      return;
    return parent._x_hidePromise ? parent : closestHide(parent);
  }
  function transition(el, setFunction, { during, start: start2, end } = {}, before = () => {
  }, after = () => {
  }) {
    if (el._x_transitioning)
      el._x_transitioning.cancel();
    if (Object.keys(during).length === 0 && Object.keys(start2).length === 0 && Object.keys(end).length === 0) {
      before();
      after();
      return;
    }
    let undoStart, undoDuring, undoEnd;
    performTransition(el, {
      start() {
        undoStart = setFunction(el, start2);
      },
      during() {
        undoDuring = setFunction(el, during);
      },
      before,
      end() {
        undoStart();
        undoEnd = setFunction(el, end);
      },
      after,
      cleanup() {
        undoDuring();
        undoEnd();
      }
    });
  }
  function performTransition(el, stages) {
    let interrupted, reachedBefore, reachedEnd;
    let finish = once(() => {
      mutateDom(() => {
        interrupted = true;
        if (!reachedBefore)
          stages.before();
        if (!reachedEnd) {
          stages.end();
          releaseNextTicks();
        }
        stages.after();
        if (el.isConnected)
          stages.cleanup();
        delete el._x_transitioning;
      });
    });
    el._x_transitioning = {
      beforeCancels: [],
      beforeCancel(callback) {
        this.beforeCancels.push(callback);
      },
      cancel: once(function() {
        while (this.beforeCancels.length) {
          this.beforeCancels.shift()();
        }
        ;
        finish();
      }),
      finish
    };
    mutateDom(() => {
      stages.start();
      stages.during();
    });
    holdNextTicks();
    requestAnimationFrame(() => {
      if (interrupted)
        return;
      let duration = Number(getComputedStyle(el).transitionDuration.replace(/,.*/, "").replace("s", "")) * 1e3;
      let delay = Number(getComputedStyle(el).transitionDelay.replace(/,.*/, "").replace("s", "")) * 1e3;
      if (duration === 0)
        duration = Number(getComputedStyle(el).animationDuration.replace("s", "")) * 1e3;
      mutateDom(() => {
        stages.before();
      });
      reachedBefore = true;
      requestAnimationFrame(() => {
        if (interrupted)
          return;
        mutateDom(() => {
          stages.end();
        });
        releaseNextTicks();
        setTimeout(el._x_transitioning.finish, duration + delay);
        reachedEnd = true;
      });
    });
  }
  function modifierValue(modifiers, key, fallback) {
    if (modifiers.indexOf(key) === -1)
      return fallback;
    const rawValue = modifiers[modifiers.indexOf(key) + 1];
    if (!rawValue)
      return fallback;
    if (key === "scale") {
      if (isNaN(rawValue))
        return fallback;
    }
    if (key === "duration" || key === "delay") {
      let match = rawValue.match(/([0-9]+)ms/);
      if (match)
        return match[1];
    }
    if (key === "origin") {
      if (["top", "right", "left", "center", "bottom"].includes(modifiers[modifiers.indexOf(key) + 2])) {
        return [rawValue, modifiers[modifiers.indexOf(key) + 2]].join(" ");
      }
    }
    return rawValue;
  }

  // packages/alpinejs/src/clone.js
  var isCloning = false;
  function skipDuringClone(callback, fallback = () => {
  }) {
    return (...args) => isCloning ? fallback(...args) : callback(...args);
  }
  function onlyDuringClone(callback) {
    return (...args) => isCloning && callback(...args);
  }
  var interceptors = [];
  function interceptClone(callback) {
    interceptors.push(callback);
  }
  function cloneNode(from, to) {
    interceptors.forEach((i) => i(from, to));
    isCloning = true;
    dontRegisterReactiveSideEffects(() => {
      initTree(to, (el, callback) => {
        callback(el, () => {
        });
      });
    });
    isCloning = false;
  }
  var isCloningLegacy = false;
  function clone(oldEl, newEl) {
    if (!newEl._x_dataStack)
      newEl._x_dataStack = oldEl._x_dataStack;
    isCloning = true;
    isCloningLegacy = true;
    dontRegisterReactiveSideEffects(() => {
      cloneTree(newEl);
    });
    isCloning = false;
    isCloningLegacy = false;
  }
  function cloneTree(el) {
    let hasRunThroughFirstEl = false;
    let shallowWalker = (el2, callback) => {
      walk(el2, (el3, skip) => {
        if (hasRunThroughFirstEl && isRoot(el3))
          return skip();
        hasRunThroughFirstEl = true;
        callback(el3, skip);
      });
    };
    initTree(el, shallowWalker);
  }
  function dontRegisterReactiveSideEffects(callback) {
    let cache = effect;
    overrideEffect((callback2, el) => {
      let storedEffect = cache(callback2);
      release(storedEffect);
      return () => {
      };
    });
    callback();
    overrideEffect(cache);
  }

  // packages/alpinejs/src/utils/bind.js
  function bind(el, name, value, modifiers = []) {
    if (!el._x_bindings)
      el._x_bindings = reactive({});
    el._x_bindings[name] = value;
    name = modifiers.includes("camel") ? camelCase(name) : name;
    switch (name) {
      case "value":
        bindInputValue(el, value);
        break;
      case "style":
        bindStyles(el, value);
        break;
      case "class":
        bindClasses(el, value);
        break;
      case "selected":
      case "checked":
        bindAttributeAndProperty(el, name, value);
        break;
      default:
        bindAttribute(el, name, value);
        break;
    }
  }
  function bindInputValue(el, value) {
    if (el.type === "radio") {
      if (el.attributes.value === void 0) {
        el.value = value;
      }
      if (window.fromModel) {
        if (typeof value === "boolean") {
          el.checked = safeParseBoolean(el.value) === value;
        } else {
          el.checked = checkedAttrLooseCompare(el.value, value);
        }
      }
    } else if (el.type === "checkbox") {
      if (Number.isInteger(value)) {
        el.value = value;
      } else if (!Array.isArray(value) && typeof value !== "boolean" && ![null, void 0].includes(value)) {
        el.value = String(value);
      } else {
        if (Array.isArray(value)) {
          el.checked = value.some((val) => checkedAttrLooseCompare(val, el.value));
        } else {
          el.checked = !!value;
        }
      }
    } else if (el.tagName === "SELECT") {
      updateSelect(el, value);
    } else {
      if (el.value === value)
        return;
      el.value = value === void 0 ? "" : value;
    }
  }
  function bindClasses(el, value) {
    if (el._x_undoAddedClasses)
      el._x_undoAddedClasses();
    el._x_undoAddedClasses = setClasses(el, value);
  }
  function bindStyles(el, value) {
    if (el._x_undoAddedStyles)
      el._x_undoAddedStyles();
    el._x_undoAddedStyles = setStyles(el, value);
  }
  function bindAttributeAndProperty(el, name, value) {
    bindAttribute(el, name, value);
    setPropertyIfChanged(el, name, value);
  }
  function bindAttribute(el, name, value) {
    if ([null, void 0, false].includes(value) && attributeShouldntBePreservedIfFalsy(name)) {
      el.removeAttribute(name);
    } else {
      if (isBooleanAttr(name))
        value = name;
      setIfChanged(el, name, value);
    }
  }
  function setIfChanged(el, attrName, value) {
    if (el.getAttribute(attrName) != value) {
      el.setAttribute(attrName, value);
    }
  }
  function setPropertyIfChanged(el, propName, value) {
    if (el[propName] !== value) {
      el[propName] = value;
    }
  }
  function updateSelect(el, value) {
    const arrayWrappedValue = [].concat(value).map((value2) => {
      return value2 + "";
    });
    Array.from(el.options).forEach((option) => {
      option.selected = arrayWrappedValue.includes(option.value);
    });
  }
  function camelCase(subject) {
    return subject.toLowerCase().replace(/-(\w)/g, (match, char) => char.toUpperCase());
  }
  function checkedAttrLooseCompare(valueA, valueB) {
    return valueA == valueB;
  }
  function safeParseBoolean(rawValue) {
    if ([1, "1", "true", "on", "yes", true].includes(rawValue)) {
      return true;
    }
    if ([0, "0", "false", "off", "no", false].includes(rawValue)) {
      return false;
    }
    return rawValue ? Boolean(rawValue) : null;
  }
  function isBooleanAttr(attrName) {
    const booleanAttributes = [
      "disabled",
      "checked",
      "required",
      "readonly",
      "open",
      "selected",
      "autofocus",
      "itemscope",
      "multiple",
      "novalidate",
      "allowfullscreen",
      "allowpaymentrequest",
      "formnovalidate",
      "autoplay",
      "controls",
      "loop",
      "muted",
      "playsinline",
      "default",
      "ismap",
      "reversed",
      "async",
      "defer",
      "nomodule"
    ];
    return booleanAttributes.includes(attrName);
  }
  function attributeShouldntBePreservedIfFalsy(name) {
    return !["aria-pressed", "aria-checked", "aria-expanded", "aria-selected"].includes(name);
  }
  function getBinding(el, name, fallback) {
    if (el._x_bindings && el._x_bindings[name] !== void 0)
      return el._x_bindings[name];
    return getAttributeBinding(el, name, fallback);
  }
  function extractProp(el, name, fallback, extract = true) {
    if (el._x_bindings && el._x_bindings[name] !== void 0)
      return el._x_bindings[name];
    if (el._x_inlineBindings && el._x_inlineBindings[name] !== void 0) {
      let binding = el._x_inlineBindings[name];
      binding.extract = extract;
      return dontAutoEvaluateFunctions(() => {
        return evaluate(el, binding.expression);
      });
    }
    return getAttributeBinding(el, name, fallback);
  }
  function getAttributeBinding(el, name, fallback) {
    let attr = el.getAttribute(name);
    if (attr === null)
      return typeof fallback === "function" ? fallback() : fallback;
    if (attr === "")
      return true;
    if (isBooleanAttr(name)) {
      return !![name, "true"].includes(attr);
    }
    return attr;
  }

  // packages/alpinejs/src/utils/debounce.js
  function debounce(func, wait) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        func.apply(context, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // packages/alpinejs/src/utils/throttle.js
  function throttle(func, limit) {
    let inThrottle;
    return function() {
      let context = this, args = arguments;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // packages/alpinejs/src/entangle.js
  function entangle({ get: outerGet, set: outerSet }, { get: innerGet, set: innerSet }) {
    let firstRun = true;
    let outerHash;
    let innerHash;
    let reference = effect(() => {
      let outer = outerGet();
      let inner = innerGet();
      if (firstRun) {
        innerSet(cloneIfObject(outer));
        firstRun = false;
      } else {
        let outerHashLatest = JSON.stringify(outer);
        let innerHashLatest = JSON.stringify(inner);
        if (outerHashLatest !== outerHash) {
          innerSet(cloneIfObject(outer));
        } else if (outerHashLatest !== innerHashLatest) {
          outerSet(cloneIfObject(inner));
        } else {
        }
      }
      outerHash = JSON.stringify(outerGet());
      innerHash = JSON.stringify(innerGet());
    });
    return () => {
      release(reference);
    };
  }
  function cloneIfObject(value) {
    return typeof value === "object" ? JSON.parse(JSON.stringify(value)) : value;
  }

  // packages/alpinejs/src/plugin.js
  function plugin(callback) {
    let callbacks = Array.isArray(callback) ? callback : [callback];
    callbacks.forEach((i) => i(alpine_default));
  }

  // packages/alpinejs/src/store.js
  var stores = {};
  var isReactive = false;
  function store(name, value) {
    if (!isReactive) {
      stores = reactive(stores);
      isReactive = true;
    }
    if (value === void 0) {
      return stores[name];
    }
    stores[name] = value;
    if (typeof value === "object" && value !== null && value.hasOwnProperty("init") && typeof value.init === "function") {
      stores[name].init();
    }
    initInterceptors(stores[name]);
  }
  function getStores() {
    return stores;
  }

  // packages/alpinejs/src/binds.js
  var binds = {};
  function bind2(name, bindings) {
    let getBindings = typeof bindings !== "function" ? () => bindings : bindings;
    if (name instanceof Element) {
      return applyBindingsObject(name, getBindings());
    } else {
      binds[name] = getBindings;
    }
    return () => {
    };
  }
  function injectBindingProviders(obj) {
    Object.entries(binds).forEach(([name, callback]) => {
      Object.defineProperty(obj, name, {
        get() {
          return (...args) => {
            return callback(...args);
          };
        }
      });
    });
    return obj;
  }
  function applyBindingsObject(el, obj, original) {
    let cleanupRunners = [];
    while (cleanupRunners.length)
      cleanupRunners.pop()();
    let attributes = Object.entries(obj).map(([name, value]) => ({ name, value }));
    let staticAttributes = attributesOnly(attributes);
    attributes = attributes.map((attribute) => {
      if (staticAttributes.find((attr) => attr.name === attribute.name)) {
        return {
          name: `x-bind:${attribute.name}`,
          value: `"${attribute.value}"`
        };
      }
      return attribute;
    });
    directives(el, attributes, original).map((handle) => {
      cleanupRunners.push(handle.runCleanups);
      handle();
    });
    return () => {
      while (cleanupRunners.length)
        cleanupRunners.pop()();
    };
  }

  // packages/alpinejs/src/datas.js
  var datas = {};
  function data(name, callback) {
    datas[name] = callback;
  }
  function injectDataProviders(obj, context) {
    Object.entries(datas).forEach(([name, callback]) => {
      Object.defineProperty(obj, name, {
        get() {
          return (...args) => {
            return callback.bind(context)(...args);
          };
        },
        enumerable: false
      });
    });
    return obj;
  }

  // packages/alpinejs/src/alpine.js
  var Alpine = {
    get reactive() {
      return reactive;
    },
    get release() {
      return release;
    },
    get effect() {
      return effect;
    },
    get raw() {
      return raw;
    },
    version: "3.14.1",
    flushAndStopDeferringMutations,
    dontAutoEvaluateFunctions,
    disableEffectScheduling,
    startObservingMutations,
    stopObservingMutations,
    setReactivityEngine,
    onAttributeRemoved,
    onAttributesAdded,
    closestDataStack,
    skipDuringClone,
    onlyDuringClone,
    addRootSelector,
    addInitSelector,
    interceptClone,
    addScopeToNode,
    deferMutations,
    mapAttributes,
    evaluateLater,
    interceptInit,
    setEvaluator,
    mergeProxies,
    extractProp,
    findClosest,
    onElRemoved,
    closestRoot,
    destroyTree,
    interceptor,
    // INTERNAL: not public API and is subject to change without major release.
    transition,
    // INTERNAL
    setStyles,
    // INTERNAL
    mutateDom,
    directive,
    entangle,
    throttle,
    debounce,
    evaluate,
    initTree,
    nextTick,
    prefixed: prefix,
    prefix: setPrefix,
    plugin,
    magic,
    store,
    start,
    clone,
    // INTERNAL
    cloneNode,
    // INTERNAL
    bound: getBinding,
    $data: scope,
    watch,
    walk,
    data,
    bind: bind2
  };
  var alpine_default = Alpine;

  // node_modules/@vue/shared/dist/shared.esm-bundler.js
  function makeMap(str, expectsLowerCase) {
    const map = /* @__PURE__ */ Object.create(null);
    const list = str.split(",");
    for (let i = 0; i < list.length; i++) {
      map[list[i]] = true;
    }
    return expectsLowerCase ? (val) => !!map[val.toLowerCase()] : (val) => !!map[val];
  }
  var specialBooleanAttrs = `itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly`;
  var isBooleanAttr2 = /* @__PURE__ */ makeMap(specialBooleanAttrs + `,async,autofocus,autoplay,controls,default,defer,disabled,hidden,loop,open,required,reversed,scoped,seamless,checked,muted,multiple,selected`);
  var EMPTY_OBJ = true ? Object.freeze({}) : {};
  var EMPTY_ARR = true ? Object.freeze([]) : [];
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var hasOwn = (val, key) => hasOwnProperty.call(val, key);
  var isArray = Array.isArray;
  var isMap = (val) => toTypeString(val) === "[object Map]";
  var isString = (val) => typeof val === "string";
  var isSymbol = (val) => typeof val === "symbol";
  var isObject = (val) => val !== null && typeof val === "object";
  var objectToString = Object.prototype.toString;
  var toTypeString = (value) => objectToString.call(value);
  var toRawType = (value) => {
    return toTypeString(value).slice(8, -1);
  };
  var isIntegerKey = (key) => isString(key) && key !== "NaN" && key[0] !== "-" && "" + parseInt(key, 10) === key;
  var cacheStringFunction = (fn) => {
    const cache = /* @__PURE__ */ Object.create(null);
    return (str) => {
      const hit = cache[str];
      return hit || (cache[str] = fn(str));
    };
  };
  var camelizeRE = /-(\w)/g;
  var camelize = cacheStringFunction((str) => {
    return str.replace(camelizeRE, (_, c) => c ? c.toUpperCase() : "");
  });
  var hyphenateRE = /\B([A-Z])/g;
  var hyphenate = cacheStringFunction((str) => str.replace(hyphenateRE, "-$1").toLowerCase());
  var capitalize = cacheStringFunction((str) => str.charAt(0).toUpperCase() + str.slice(1));
  var toHandlerKey = cacheStringFunction((str) => str ? `on${capitalize(str)}` : ``);
  var hasChanged = (value, oldValue) => value !== oldValue && (value === value || oldValue === oldValue);

  // node_modules/@vue/reactivity/dist/reactivity.esm-bundler.js
  var targetMap = /* @__PURE__ */ new WeakMap();
  var effectStack = [];
  var activeEffect;
  var ITERATE_KEY = Symbol(true ? "iterate" : "");
  var MAP_KEY_ITERATE_KEY = Symbol(true ? "Map key iterate" : "");
  function isEffect(fn) {
    return fn && fn._isEffect === true;
  }
  function effect2(fn, options = EMPTY_OBJ) {
    if (isEffect(fn)) {
      fn = fn.raw;
    }
    const effect3 = createReactiveEffect(fn, options);
    if (!options.lazy) {
      effect3();
    }
    return effect3;
  }
  function stop(effect3) {
    if (effect3.active) {
      cleanup(effect3);
      if (effect3.options.onStop) {
        effect3.options.onStop();
      }
      effect3.active = false;
    }
  }
  var uid = 0;
  function createReactiveEffect(fn, options) {
    const effect3 = function reactiveEffect() {
      if (!effect3.active) {
        return fn();
      }
      if (!effectStack.includes(effect3)) {
        cleanup(effect3);
        try {
          enableTracking();
          effectStack.push(effect3);
          activeEffect = effect3;
          return fn();
        } finally {
          effectStack.pop();
          resetTracking();
          activeEffect = effectStack[effectStack.length - 1];
        }
      }
    };
    effect3.id = uid++;
    effect3.allowRecurse = !!options.allowRecurse;
    effect3._isEffect = true;
    effect3.active = true;
    effect3.raw = fn;
    effect3.deps = [];
    effect3.options = options;
    return effect3;
  }
  function cleanup(effect3) {
    const { deps } = effect3;
    if (deps.length) {
      for (let i = 0; i < deps.length; i++) {
        deps[i].delete(effect3);
      }
      deps.length = 0;
    }
  }
  var shouldTrack = true;
  var trackStack = [];
  function pauseTracking() {
    trackStack.push(shouldTrack);
    shouldTrack = false;
  }
  function enableTracking() {
    trackStack.push(shouldTrack);
    shouldTrack = true;
  }
  function resetTracking() {
    const last = trackStack.pop();
    shouldTrack = last === void 0 ? true : last;
  }
  function track(target, type, key) {
    if (!shouldTrack || activeEffect === void 0) {
      return;
    }
    let depsMap = targetMap.get(target);
    if (!depsMap) {
      targetMap.set(target, depsMap = /* @__PURE__ */ new Map());
    }
    let dep = depsMap.get(key);
    if (!dep) {
      depsMap.set(key, dep = /* @__PURE__ */ new Set());
    }
    if (!dep.has(activeEffect)) {
      dep.add(activeEffect);
      activeEffect.deps.push(dep);
      if (activeEffect.options.onTrack) {
        activeEffect.options.onTrack({
          effect: activeEffect,
          target,
          type,
          key
        });
      }
    }
  }
  function trigger(target, type, key, newValue, oldValue, oldTarget) {
    const depsMap = targetMap.get(target);
    if (!depsMap) {
      return;
    }
    const effects = /* @__PURE__ */ new Set();
    const add2 = (effectsToAdd) => {
      if (effectsToAdd) {
        effectsToAdd.forEach((effect3) => {
          if (effect3 !== activeEffect || effect3.allowRecurse) {
            effects.add(effect3);
          }
        });
      }
    };
    if (type === "clear") {
      depsMap.forEach(add2);
    } else if (key === "length" && isArray(target)) {
      depsMap.forEach((dep, key2) => {
        if (key2 === "length" || key2 >= newValue) {
          add2(dep);
        }
      });
    } else {
      if (key !== void 0) {
        add2(depsMap.get(key));
      }
      switch (type) {
        case "add":
          if (!isArray(target)) {
            add2(depsMap.get(ITERATE_KEY));
            if (isMap(target)) {
              add2(depsMap.get(MAP_KEY_ITERATE_KEY));
            }
          } else if (isIntegerKey(key)) {
            add2(depsMap.get("length"));
          }
          break;
        case "delete":
          if (!isArray(target)) {
            add2(depsMap.get(ITERATE_KEY));
            if (isMap(target)) {
              add2(depsMap.get(MAP_KEY_ITERATE_KEY));
            }
          }
          break;
        case "set":
          if (isMap(target)) {
            add2(depsMap.get(ITERATE_KEY));
          }
          break;
      }
    }
    const run = (effect3) => {
      if (effect3.options.onTrigger) {
        effect3.options.onTrigger({
          effect: effect3,
          target,
          key,
          type,
          newValue,
          oldValue,
          oldTarget
        });
      }
      if (effect3.options.scheduler) {
        effect3.options.scheduler(effect3);
      } else {
        effect3();
      }
    };
    effects.forEach(run);
  }
  var isNonTrackableKeys = /* @__PURE__ */ makeMap(`__proto__,__v_isRef,__isVue`);
  var builtInSymbols = new Set(Object.getOwnPropertyNames(Symbol).map((key) => Symbol[key]).filter(isSymbol));
  var get2 = /* @__PURE__ */ createGetter();
  var readonlyGet = /* @__PURE__ */ createGetter(true);
  var arrayInstrumentations = /* @__PURE__ */ createArrayInstrumentations();
  function createArrayInstrumentations() {
    const instrumentations = {};
    ["includes", "indexOf", "lastIndexOf"].forEach((key) => {
      instrumentations[key] = function(...args) {
        const arr = toRaw(this);
        for (let i = 0, l = this.length; i < l; i++) {
          track(arr, "get", i + "");
        }
        const res = arr[key](...args);
        if (res === -1 || res === false) {
          return arr[key](...args.map(toRaw));
        } else {
          return res;
        }
      };
    });
    ["push", "pop", "shift", "unshift", "splice"].forEach((key) => {
      instrumentations[key] = function(...args) {
        pauseTracking();
        const res = toRaw(this)[key].apply(this, args);
        resetTracking();
        return res;
      };
    });
    return instrumentations;
  }
  function createGetter(isReadonly = false, shallow = false) {
    return function get3(target, key, receiver) {
      if (key === "__v_isReactive") {
        return !isReadonly;
      } else if (key === "__v_isReadonly") {
        return isReadonly;
      } else if (key === "__v_raw" && receiver === (isReadonly ? shallow ? shallowReadonlyMap : readonlyMap : shallow ? shallowReactiveMap : reactiveMap).get(target)) {
        return target;
      }
      const targetIsArray = isArray(target);
      if (!isReadonly && targetIsArray && hasOwn(arrayInstrumentations, key)) {
        return Reflect.get(arrayInstrumentations, key, receiver);
      }
      const res = Reflect.get(target, key, receiver);
      if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
        return res;
      }
      if (!isReadonly) {
        track(target, "get", key);
      }
      if (shallow) {
        return res;
      }
      if (isRef(res)) {
        const shouldUnwrap = !targetIsArray || !isIntegerKey(key);
        return shouldUnwrap ? res.value : res;
      }
      if (isObject(res)) {
        return isReadonly ? readonly(res) : reactive2(res);
      }
      return res;
    };
  }
  var set2 = /* @__PURE__ */ createSetter();
  function createSetter(shallow = false) {
    return function set3(target, key, value, receiver) {
      let oldValue = target[key];
      if (!shallow) {
        value = toRaw(value);
        oldValue = toRaw(oldValue);
        if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
          oldValue.value = value;
          return true;
        }
      }
      const hadKey = isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key);
      const result = Reflect.set(target, key, value, receiver);
      if (target === toRaw(receiver)) {
        if (!hadKey) {
          trigger(target, "add", key, value);
        } else if (hasChanged(value, oldValue)) {
          trigger(target, "set", key, value, oldValue);
        }
      }
      return result;
    };
  }
  function deleteProperty(target, key) {
    const hadKey = hasOwn(target, key);
    const oldValue = target[key];
    const result = Reflect.deleteProperty(target, key);
    if (result && hadKey) {
      trigger(target, "delete", key, void 0, oldValue);
    }
    return result;
  }
  function has(target, key) {
    const result = Reflect.has(target, key);
    if (!isSymbol(key) || !builtInSymbols.has(key)) {
      track(target, "has", key);
    }
    return result;
  }
  function ownKeys(target) {
    track(target, "iterate", isArray(target) ? "length" : ITERATE_KEY);
    return Reflect.ownKeys(target);
  }
  var mutableHandlers = {
    get: get2,
    set: set2,
    deleteProperty,
    has,
    ownKeys
  };
  var readonlyHandlers = {
    get: readonlyGet,
    set(target, key) {
      if (true) {
        console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target);
      }
      return true;
    },
    deleteProperty(target, key) {
      if (true) {
        console.warn(`Delete operation on key "${String(key)}" failed: target is readonly.`, target);
      }
      return true;
    }
  };
  var toReactive = (value) => isObject(value) ? reactive2(value) : value;
  var toReadonly = (value) => isObject(value) ? readonly(value) : value;
  var toShallow = (value) => value;
  var getProto = (v) => Reflect.getPrototypeOf(v);
  function get$1(target, key, isReadonly = false, isShallow = false) {
    target = target[
      "__v_raw"
      /* RAW */
    ];
    const rawTarget = toRaw(target);
    const rawKey = toRaw(key);
    if (key !== rawKey) {
      !isReadonly && track(rawTarget, "get", key);
    }
    !isReadonly && track(rawTarget, "get", rawKey);
    const { has: has2 } = getProto(rawTarget);
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
    if (has2.call(rawTarget, key)) {
      return wrap(target.get(key));
    } else if (has2.call(rawTarget, rawKey)) {
      return wrap(target.get(rawKey));
    } else if (target !== rawTarget) {
      target.get(key);
    }
  }
  function has$1(key, isReadonly = false) {
    const target = this[
      "__v_raw"
      /* RAW */
    ];
    const rawTarget = toRaw(target);
    const rawKey = toRaw(key);
    if (key !== rawKey) {
      !isReadonly && track(rawTarget, "has", key);
    }
    !isReadonly && track(rawTarget, "has", rawKey);
    return key === rawKey ? target.has(key) : target.has(key) || target.has(rawKey);
  }
  function size(target, isReadonly = false) {
    target = target[
      "__v_raw"
      /* RAW */
    ];
    !isReadonly && track(toRaw(target), "iterate", ITERATE_KEY);
    return Reflect.get(target, "size", target);
  }
  function add(value) {
    value = toRaw(value);
    const target = toRaw(this);
    const proto = getProto(target);
    const hadKey = proto.has.call(target, value);
    if (!hadKey) {
      target.add(value);
      trigger(target, "add", value, value);
    }
    return this;
  }
  function set$1(key, value) {
    value = toRaw(value);
    const target = toRaw(this);
    const { has: has2, get: get3 } = getProto(target);
    let hadKey = has2.call(target, key);
    if (!hadKey) {
      key = toRaw(key);
      hadKey = has2.call(target, key);
    } else if (true) {
      checkIdentityKeys(target, has2, key);
    }
    const oldValue = get3.call(target, key);
    target.set(key, value);
    if (!hadKey) {
      trigger(target, "add", key, value);
    } else if (hasChanged(value, oldValue)) {
      trigger(target, "set", key, value, oldValue);
    }
    return this;
  }
  function deleteEntry(key) {
    const target = toRaw(this);
    const { has: has2, get: get3 } = getProto(target);
    let hadKey = has2.call(target, key);
    if (!hadKey) {
      key = toRaw(key);
      hadKey = has2.call(target, key);
    } else if (true) {
      checkIdentityKeys(target, has2, key);
    }
    const oldValue = get3 ? get3.call(target, key) : void 0;
    const result = target.delete(key);
    if (hadKey) {
      trigger(target, "delete", key, void 0, oldValue);
    }
    return result;
  }
  function clear() {
    const target = toRaw(this);
    const hadItems = target.size !== 0;
    const oldTarget = true ? isMap(target) ? new Map(target) : new Set(target) : void 0;
    const result = target.clear();
    if (hadItems) {
      trigger(target, "clear", void 0, void 0, oldTarget);
    }
    return result;
  }
  function createForEach(isReadonly, isShallow) {
    return function forEach(callback, thisArg) {
      const observed = this;
      const target = observed[
        "__v_raw"
        /* RAW */
      ];
      const rawTarget = toRaw(target);
      const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
      !isReadonly && track(rawTarget, "iterate", ITERATE_KEY);
      return target.forEach((value, key) => {
        return callback.call(thisArg, wrap(value), wrap(key), observed);
      });
    };
  }
  function createIterableMethod(method, isReadonly, isShallow) {
    return function(...args) {
      const target = this[
        "__v_raw"
        /* RAW */
      ];
      const rawTarget = toRaw(target);
      const targetIsMap = isMap(rawTarget);
      const isPair = method === "entries" || method === Symbol.iterator && targetIsMap;
      const isKeyOnly = method === "keys" && targetIsMap;
      const innerIterator = target[method](...args);
      const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
      !isReadonly && track(rawTarget, "iterate", isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY);
      return {
        // iterator protocol
        next() {
          const { value, done } = innerIterator.next();
          return done ? { value, done } : {
            value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
            done
          };
        },
        // iterable protocol
        [Symbol.iterator]() {
          return this;
        }
      };
    };
  }
  function createReadonlyMethod(type) {
    return function(...args) {
      if (true) {
        const key = args[0] ? `on key "${args[0]}" ` : ``;
        console.warn(`${capitalize(type)} operation ${key}failed: target is readonly.`, toRaw(this));
      }
      return type === "delete" ? false : this;
    };
  }
  function createInstrumentations() {
    const mutableInstrumentations2 = {
      get(key) {
        return get$1(this, key);
      },
      get size() {
        return size(this);
      },
      has: has$1,
      add,
      set: set$1,
      delete: deleteEntry,
      clear,
      forEach: createForEach(false, false)
    };
    const shallowInstrumentations2 = {
      get(key) {
        return get$1(this, key, false, true);
      },
      get size() {
        return size(this);
      },
      has: has$1,
      add,
      set: set$1,
      delete: deleteEntry,
      clear,
      forEach: createForEach(false, true)
    };
    const readonlyInstrumentations2 = {
      get(key) {
        return get$1(this, key, true);
      },
      get size() {
        return size(this, true);
      },
      has(key) {
        return has$1.call(this, key, true);
      },
      add: createReadonlyMethod(
        "add"
        /* ADD */
      ),
      set: createReadonlyMethod(
        "set"
        /* SET */
      ),
      delete: createReadonlyMethod(
        "delete"
        /* DELETE */
      ),
      clear: createReadonlyMethod(
        "clear"
        /* CLEAR */
      ),
      forEach: createForEach(true, false)
    };
    const shallowReadonlyInstrumentations2 = {
      get(key) {
        return get$1(this, key, true, true);
      },
      get size() {
        return size(this, true);
      },
      has(key) {
        return has$1.call(this, key, true);
      },
      add: createReadonlyMethod(
        "add"
        /* ADD */
      ),
      set: createReadonlyMethod(
        "set"
        /* SET */
      ),
      delete: createReadonlyMethod(
        "delete"
        /* DELETE */
      ),
      clear: createReadonlyMethod(
        "clear"
        /* CLEAR */
      ),
      forEach: createForEach(true, true)
    };
    const iteratorMethods = ["keys", "values", "entries", Symbol.iterator];
    iteratorMethods.forEach((method) => {
      mutableInstrumentations2[method] = createIterableMethod(method, false, false);
      readonlyInstrumentations2[method] = createIterableMethod(method, true, false);
      shallowInstrumentations2[method] = createIterableMethod(method, false, true);
      shallowReadonlyInstrumentations2[method] = createIterableMethod(method, true, true);
    });
    return [
      mutableInstrumentations2,
      readonlyInstrumentations2,
      shallowInstrumentations2,
      shallowReadonlyInstrumentations2
    ];
  }
  var [mutableInstrumentations, readonlyInstrumentations, shallowInstrumentations, shallowReadonlyInstrumentations] = /* @__PURE__ */ createInstrumentations();
  function createInstrumentationGetter(isReadonly, shallow) {
    const instrumentations = shallow ? isReadonly ? shallowReadonlyInstrumentations : shallowInstrumentations : isReadonly ? readonlyInstrumentations : mutableInstrumentations;
    return (target, key, receiver) => {
      if (key === "__v_isReactive") {
        return !isReadonly;
      } else if (key === "__v_isReadonly") {
        return isReadonly;
      } else if (key === "__v_raw") {
        return target;
      }
      return Reflect.get(hasOwn(instrumentations, key) && key in target ? instrumentations : target, key, receiver);
    };
  }
  var mutableCollectionHandlers = {
    get: /* @__PURE__ */ createInstrumentationGetter(false, false)
  };
  var readonlyCollectionHandlers = {
    get: /* @__PURE__ */ createInstrumentationGetter(true, false)
  };
  function checkIdentityKeys(target, has2, key) {
    const rawKey = toRaw(key);
    if (rawKey !== key && has2.call(target, rawKey)) {
      const type = toRawType(target);
      console.warn(`Reactive ${type} contains both the raw and reactive versions of the same object${type === `Map` ? ` as keys` : ``}, which can lead to inconsistencies. Avoid differentiating between the raw and reactive versions of an object and only use the reactive version if possible.`);
    }
  }
  var reactiveMap = /* @__PURE__ */ new WeakMap();
  var shallowReactiveMap = /* @__PURE__ */ new WeakMap();
  var readonlyMap = /* @__PURE__ */ new WeakMap();
  var shallowReadonlyMap = /* @__PURE__ */ new WeakMap();
  function targetTypeMap(rawType) {
    switch (rawType) {
      case "Object":
      case "Array":
        return 1;
      case "Map":
      case "Set":
      case "WeakMap":
      case "WeakSet":
        return 2;
      default:
        return 0;
    }
  }
  function getTargetType(value) {
    return value[
      "__v_skip"
      /* SKIP */
    ] || !Object.isExtensible(value) ? 0 : targetTypeMap(toRawType(value));
  }
  function reactive2(target) {
    if (target && target[
      "__v_isReadonly"
      /* IS_READONLY */
    ]) {
      return target;
    }
    return createReactiveObject(target, false, mutableHandlers, mutableCollectionHandlers, reactiveMap);
  }
  function readonly(target) {
    return createReactiveObject(target, true, readonlyHandlers, readonlyCollectionHandlers, readonlyMap);
  }
  function createReactiveObject(target, isReadonly, baseHandlers, collectionHandlers, proxyMap) {
    if (!isObject(target)) {
      if (true) {
        console.warn(`value cannot be made reactive: ${String(target)}`);
      }
      return target;
    }
    if (target[
      "__v_raw"
      /* RAW */
    ] && !(isReadonly && target[
      "__v_isReactive"
      /* IS_REACTIVE */
    ])) {
      return target;
    }
    const existingProxy = proxyMap.get(target);
    if (existingProxy) {
      return existingProxy;
    }
    const targetType = getTargetType(target);
    if (targetType === 0) {
      return target;
    }
    const proxy = new Proxy(target, targetType === 2 ? collectionHandlers : baseHandlers);
    proxyMap.set(target, proxy);
    return proxy;
  }
  function toRaw(observed) {
    return observed && toRaw(observed[
      "__v_raw"
      /* RAW */
    ]) || observed;
  }
  function isRef(r) {
    return Boolean(r && r.__v_isRef === true);
  }

  // packages/alpinejs/src/magics/$nextTick.js
  magic("nextTick", () => nextTick);

  // packages/alpinejs/src/magics/$dispatch.js
  magic("dispatch", (el) => dispatch.bind(dispatch, el));

  // packages/alpinejs/src/magics/$watch.js
  magic("watch", (el, { evaluateLater: evaluateLater2, cleanup: cleanup2 }) => (key, callback) => {
    let evaluate2 = evaluateLater2(key);
    let getter = () => {
      let value;
      evaluate2((i) => value = i);
      return value;
    };
    let unwatch = watch(getter, callback);
    cleanup2(unwatch);
  });

  // packages/alpinejs/src/magics/$store.js
  magic("store", getStores);

  // packages/alpinejs/src/magics/$data.js
  magic("data", (el) => scope(el));

  // packages/alpinejs/src/magics/$root.js
  magic("root", (el) => closestRoot(el));

  // packages/alpinejs/src/magics/$refs.js
  magic("refs", (el) => {
    if (el._x_refs_proxy)
      return el._x_refs_proxy;
    el._x_refs_proxy = mergeProxies(getArrayOfRefObject(el));
    return el._x_refs_proxy;
  });
  function getArrayOfRefObject(el) {
    let refObjects = [];
    findClosest(el, (i) => {
      if (i._x_refs)
        refObjects.push(i._x_refs);
    });
    return refObjects;
  }

  // packages/alpinejs/src/ids.js
  var globalIdMemo = {};
  function findAndIncrementId(name) {
    if (!globalIdMemo[name])
      globalIdMemo[name] = 0;
    return ++globalIdMemo[name];
  }
  function closestIdRoot(el, name) {
    return findClosest(el, (element) => {
      if (element._x_ids && element._x_ids[name])
        return true;
    });
  }
  function setIdRoot(el, name) {
    if (!el._x_ids)
      el._x_ids = {};
    if (!el._x_ids[name])
      el._x_ids[name] = findAndIncrementId(name);
  }

  // packages/alpinejs/src/magics/$id.js
  magic("id", (el, { cleanup: cleanup2 }) => (name, key = null) => {
    let cacheKey = `${name}${key ? `-${key}` : ""}`;
    return cacheIdByNameOnElement(el, cacheKey, cleanup2, () => {
      let root = closestIdRoot(el, name);
      let id = root ? root._x_ids[name] : findAndIncrementId(name);
      return key ? `${name}-${id}-${key}` : `${name}-${id}`;
    });
  });
  interceptClone((from, to) => {
    if (from._x_id) {
      to._x_id = from._x_id;
    }
  });
  function cacheIdByNameOnElement(el, cacheKey, cleanup2, callback) {
    if (!el._x_id)
      el._x_id = {};
    if (el._x_id[cacheKey])
      return el._x_id[cacheKey];
    let output = callback();
    el._x_id[cacheKey] = output;
    cleanup2(() => {
      delete el._x_id[cacheKey];
    });
    return output;
  }

  // packages/alpinejs/src/magics/$el.js
  magic("el", (el) => el);

  // packages/alpinejs/src/magics/index.js
  warnMissingPluginMagic("Focus", "focus", "focus");
  warnMissingPluginMagic("Persist", "persist", "persist");
  function warnMissingPluginMagic(name, magicName, slug) {
    magic(magicName, (el) => warn(`You can't use [$${magicName}] without first installing the "${name}" plugin here: https://alpinejs.dev/plugins/${slug}`, el));
  }

  // packages/alpinejs/src/directives/x-modelable.js
  directive("modelable", (el, { expression }, { effect: effect3, evaluateLater: evaluateLater2, cleanup: cleanup2 }) => {
    let func = evaluateLater2(expression);
    let innerGet = () => {
      let result;
      func((i) => result = i);
      return result;
    };
    let evaluateInnerSet = evaluateLater2(`${expression} = __placeholder`);
    let innerSet = (val) => evaluateInnerSet(() => {
    }, { scope: { "__placeholder": val } });
    let initialValue = innerGet();
    innerSet(initialValue);
    queueMicrotask(() => {
      if (!el._x_model)
        return;
      el._x_removeModelListeners["default"]();
      let outerGet = el._x_model.get;
      let outerSet = el._x_model.set;
      let releaseEntanglement = entangle(
        {
          get() {
            return outerGet();
          },
          set(value) {
            outerSet(value);
          }
        },
        {
          get() {
            return innerGet();
          },
          set(value) {
            innerSet(value);
          }
        }
      );
      cleanup2(releaseEntanglement);
    });
  });

  // packages/alpinejs/src/directives/x-teleport.js
  directive("teleport", (el, { modifiers, expression }, { cleanup: cleanup2 }) => {
    if (el.tagName.toLowerCase() !== "template")
      warn("x-teleport can only be used on a <template> tag", el);
    let target = getTarget(expression);
    let clone2 = el.content.cloneNode(true).firstElementChild;
    el._x_teleport = clone2;
    clone2._x_teleportBack = el;
    el.setAttribute("data-teleport-template", true);
    clone2.setAttribute("data-teleport-target", true);
    if (el._x_forwardEvents) {
      el._x_forwardEvents.forEach((eventName) => {
        clone2.addEventListener(eventName, (e) => {
          e.stopPropagation();
          el.dispatchEvent(new e.constructor(e.type, e));
        });
      });
    }
    addScopeToNode(clone2, {}, el);
    let placeInDom = (clone3, target2, modifiers2) => {
      if (modifiers2.includes("prepend")) {
        target2.parentNode.insertBefore(clone3, target2);
      } else if (modifiers2.includes("append")) {
        target2.parentNode.insertBefore(clone3, target2.nextSibling);
      } else {
        target2.appendChild(clone3);
      }
    };
    mutateDom(() => {
      placeInDom(clone2, target, modifiers);
      skipDuringClone(() => {
        initTree(clone2);
        clone2._x_ignore = true;
      })();
    });
    el._x_teleportPutBack = () => {
      let target2 = getTarget(expression);
      mutateDom(() => {
        placeInDom(el._x_teleport, target2, modifiers);
      });
    };
    cleanup2(() => clone2.remove());
  });
  var teleportContainerDuringClone = document.createElement("div");
  function getTarget(expression) {
    let target = skipDuringClone(() => {
      return document.querySelector(expression);
    }, () => {
      return teleportContainerDuringClone;
    })();
    if (!target)
      warn(`Cannot find x-teleport element for selector: "${expression}"`);
    return target;
  }

  // packages/alpinejs/src/directives/x-ignore.js
  var handler = () => {
  };
  handler.inline = (el, { modifiers }, { cleanup: cleanup2 }) => {
    modifiers.includes("self") ? el._x_ignoreSelf = true : el._x_ignore = true;
    cleanup2(() => {
      modifiers.includes("self") ? delete el._x_ignoreSelf : delete el._x_ignore;
    });
  };
  directive("ignore", handler);

  // packages/alpinejs/src/directives/x-effect.js
  directive("effect", skipDuringClone((el, { expression }, { effect: effect3 }) => {
    effect3(evaluateLater(el, expression));
  }));

  // packages/alpinejs/src/utils/on.js
  function on(el, event, modifiers, callback) {
    let listenerTarget = el;
    let handler4 = (e) => callback(e);
    let options = {};
    let wrapHandler = (callback2, wrapper) => (e) => wrapper(callback2, e);
    if (modifiers.includes("dot"))
      event = dotSyntax(event);
    if (modifiers.includes("camel"))
      event = camelCase2(event);
    if (modifiers.includes("passive"))
      options.passive = true;
    if (modifiers.includes("capture"))
      options.capture = true;
    if (modifiers.includes("window"))
      listenerTarget = window;
    if (modifiers.includes("document"))
      listenerTarget = document;
    if (modifiers.includes("debounce")) {
      let nextModifier = modifiers[modifiers.indexOf("debounce") + 1] || "invalid-wait";
      let wait = isNumeric(nextModifier.split("ms")[0]) ? Number(nextModifier.split("ms")[0]) : 250;
      handler4 = debounce(handler4, wait);
    }
    if (modifiers.includes("throttle")) {
      let nextModifier = modifiers[modifiers.indexOf("throttle") + 1] || "invalid-wait";
      let wait = isNumeric(nextModifier.split("ms")[0]) ? Number(nextModifier.split("ms")[0]) : 250;
      handler4 = throttle(handler4, wait);
    }
    if (modifiers.includes("prevent"))
      handler4 = wrapHandler(handler4, (next, e) => {
        e.preventDefault();
        next(e);
      });
    if (modifiers.includes("stop"))
      handler4 = wrapHandler(handler4, (next, e) => {
        e.stopPropagation();
        next(e);
      });
    if (modifiers.includes("once")) {
      handler4 = wrapHandler(handler4, (next, e) => {
        next(e);
        listenerTarget.removeEventListener(event, handler4, options);
      });
    }
    if (modifiers.includes("away") || modifiers.includes("outside")) {
      listenerTarget = document;
      handler4 = wrapHandler(handler4, (next, e) => {
        if (el.contains(e.target))
          return;
        if (e.target.isConnected === false)
          return;
        if (el.offsetWidth < 1 && el.offsetHeight < 1)
          return;
        if (el._x_isShown === false)
          return;
        next(e);
      });
    }
    if (modifiers.includes("self"))
      handler4 = wrapHandler(handler4, (next, e) => {
        e.target === el && next(e);
      });
    if (isKeyEvent(event) || isClickEvent(event)) {
      handler4 = wrapHandler(handler4, (next, e) => {
        if (isListeningForASpecificKeyThatHasntBeenPressed(e, modifiers)) {
          return;
        }
        next(e);
      });
    }
    listenerTarget.addEventListener(event, handler4, options);
    return () => {
      listenerTarget.removeEventListener(event, handler4, options);
    };
  }
  function dotSyntax(subject) {
    return subject.replace(/-/g, ".");
  }
  function camelCase2(subject) {
    return subject.toLowerCase().replace(/-(\w)/g, (match, char) => char.toUpperCase());
  }
  function isNumeric(subject) {
    return !Array.isArray(subject) && !isNaN(subject);
  }
  function kebabCase2(subject) {
    if ([" ", "_"].includes(
      subject
    ))
      return subject;
    return subject.replace(/([a-z])([A-Z])/g, "$1-$2").replace(/[_\s]/, "-").toLowerCase();
  }
  function isKeyEvent(event) {
    return ["keydown", "keyup"].includes(event);
  }
  function isClickEvent(event) {
    return ["contextmenu", "click", "mouse"].some((i) => event.includes(i));
  }
  function isListeningForASpecificKeyThatHasntBeenPressed(e, modifiers) {
    let keyModifiers = modifiers.filter((i) => {
      return !["window", "document", "prevent", "stop", "once", "capture", "self", "away", "outside", "passive"].includes(i);
    });
    if (keyModifiers.includes("debounce")) {
      let debounceIndex = keyModifiers.indexOf("debounce");
      keyModifiers.splice(debounceIndex, isNumeric((keyModifiers[debounceIndex + 1] || "invalid-wait").split("ms")[0]) ? 2 : 1);
    }
    if (keyModifiers.includes("throttle")) {
      let debounceIndex = keyModifiers.indexOf("throttle");
      keyModifiers.splice(debounceIndex, isNumeric((keyModifiers[debounceIndex + 1] || "invalid-wait").split("ms")[0]) ? 2 : 1);
    }
    if (keyModifiers.length === 0)
      return false;
    if (keyModifiers.length === 1 && keyToModifiers(e.key).includes(keyModifiers[0]))
      return false;
    const systemKeyModifiers = ["ctrl", "shift", "alt", "meta", "cmd", "super"];
    const selectedSystemKeyModifiers = systemKeyModifiers.filter((modifier) => keyModifiers.includes(modifier));
    keyModifiers = keyModifiers.filter((i) => !selectedSystemKeyModifiers.includes(i));
    if (selectedSystemKeyModifiers.length > 0) {
      const activelyPressedKeyModifiers = selectedSystemKeyModifiers.filter((modifier) => {
        if (modifier === "cmd" || modifier === "super")
          modifier = "meta";
        return e[`${modifier}Key`];
      });
      if (activelyPressedKeyModifiers.length === selectedSystemKeyModifiers.length) {
        if (isClickEvent(e.type))
          return false;
        if (keyToModifiers(e.key).includes(keyModifiers[0]))
          return false;
      }
    }
    return true;
  }
  function keyToModifiers(key) {
    if (!key)
      return [];
    key = kebabCase2(key);
    let modifierToKeyMap = {
      "ctrl": "control",
      "slash": "/",
      "space": " ",
      "spacebar": " ",
      "cmd": "meta",
      "esc": "escape",
      "up": "arrow-up",
      "down": "arrow-down",
      "left": "arrow-left",
      "right": "arrow-right",
      "period": ".",
      "comma": ",",
      "equal": "=",
      "minus": "-",
      "underscore": "_"
    };
    modifierToKeyMap[key] = key;
    return Object.keys(modifierToKeyMap).map((modifier) => {
      if (modifierToKeyMap[modifier] === key)
        return modifier;
    }).filter((modifier) => modifier);
  }

  // packages/alpinejs/src/directives/x-model.js
  directive("model", (el, { modifiers, expression }, { effect: effect3, cleanup: cleanup2 }) => {
    let scopeTarget = el;
    if (modifiers.includes("parent")) {
      scopeTarget = el.parentNode;
    }
    let evaluateGet = evaluateLater(scopeTarget, expression);
    let evaluateSet;
    if (typeof expression === "string") {
      evaluateSet = evaluateLater(scopeTarget, `${expression} = __placeholder`);
    } else if (typeof expression === "function" && typeof expression() === "string") {
      evaluateSet = evaluateLater(scopeTarget, `${expression()} = __placeholder`);
    } else {
      evaluateSet = () => {
      };
    }
    let getValue = () => {
      let result;
      evaluateGet((value) => result = value);
      return isGetterSetter(result) ? result.get() : result;
    };
    let setValue = (value) => {
      let result;
      evaluateGet((value2) => result = value2);
      if (isGetterSetter(result)) {
        result.set(value);
      } else {
        evaluateSet(() => {
        }, {
          scope: { "__placeholder": value }
        });
      }
    };
    if (typeof expression === "string" && el.type === "radio") {
      mutateDom(() => {
        if (!el.hasAttribute("name"))
          el.setAttribute("name", expression);
      });
    }
    var event = el.tagName.toLowerCase() === "select" || ["checkbox", "radio"].includes(el.type) || modifiers.includes("lazy") ? "change" : "input";
    let removeListener = isCloning ? () => {
    } : on(el, event, modifiers, (e) => {
      setValue(getInputValue(el, modifiers, e, getValue()));
    });
    if (modifiers.includes("fill")) {
      if ([void 0, null, ""].includes(getValue()) || el.type === "checkbox" && Array.isArray(getValue()) || el.tagName.toLowerCase() === "select" && el.multiple) {
        setValue(
          getInputValue(el, modifiers, { target: el }, getValue())
        );
      }
    }
    if (!el._x_removeModelListeners)
      el._x_removeModelListeners = {};
    el._x_removeModelListeners["default"] = removeListener;
    cleanup2(() => el._x_removeModelListeners["default"]());
    if (el.form) {
      let removeResetListener = on(el.form, "reset", [], (e) => {
        nextTick(() => el._x_model && el._x_model.set(getInputValue(el, modifiers, { target: el }, getValue())));
      });
      cleanup2(() => removeResetListener());
    }
    el._x_model = {
      get() {
        return getValue();
      },
      set(value) {
        setValue(value);
      }
    };
    el._x_forceModelUpdate = (value) => {
      if (value === void 0 && typeof expression === "string" && expression.match(/\./))
        value = "";
      window.fromModel = true;
      mutateDom(() => bind(el, "value", value));
      delete window.fromModel;
    };
    effect3(() => {
      let value = getValue();
      if (modifiers.includes("unintrusive") && document.activeElement.isSameNode(el))
        return;
      el._x_forceModelUpdate(value);
    });
  });
  function getInputValue(el, modifiers, event, currentValue) {
    return mutateDom(() => {
      if (event instanceof CustomEvent && event.detail !== void 0)
        return event.detail !== null && event.detail !== void 0 ? event.detail : event.target.value;
      else if (el.type === "checkbox") {
        if (Array.isArray(currentValue)) {
          let newValue = null;
          if (modifiers.includes("number")) {
            newValue = safeParseNumber(event.target.value);
          } else if (modifiers.includes("boolean")) {
            newValue = safeParseBoolean(event.target.value);
          } else {
            newValue = event.target.value;
          }
          return event.target.checked ? currentValue.includes(newValue) ? currentValue : currentValue.concat([newValue]) : currentValue.filter((el2) => !checkedAttrLooseCompare2(el2, newValue));
        } else {
          return event.target.checked;
        }
      } else if (el.tagName.toLowerCase() === "select" && el.multiple) {
        if (modifiers.includes("number")) {
          return Array.from(event.target.selectedOptions).map((option) => {
            let rawValue = option.value || option.text;
            return safeParseNumber(rawValue);
          });
        } else if (modifiers.includes("boolean")) {
          return Array.from(event.target.selectedOptions).map((option) => {
            let rawValue = option.value || option.text;
            return safeParseBoolean(rawValue);
          });
        }
        return Array.from(event.target.selectedOptions).map((option) => {
          return option.value || option.text;
        });
      } else {
        let newValue;
        if (el.type === "radio") {
          if (event.target.checked) {
            newValue = event.target.value;
          } else {
            newValue = currentValue;
          }
        } else {
          newValue = event.target.value;
        }
        if (modifiers.includes("number")) {
          return safeParseNumber(newValue);
        } else if (modifiers.includes("boolean")) {
          return safeParseBoolean(newValue);
        } else if (modifiers.includes("trim")) {
          return newValue.trim();
        } else {
          return newValue;
        }
      }
    });
  }
  function safeParseNumber(rawValue) {
    let number = rawValue ? parseFloat(rawValue) : null;
    return isNumeric2(number) ? number : rawValue;
  }
  function checkedAttrLooseCompare2(valueA, valueB) {
    return valueA == valueB;
  }
  function isNumeric2(subject) {
    return !Array.isArray(subject) && !isNaN(subject);
  }
  function isGetterSetter(value) {
    return value !== null && typeof value === "object" && typeof value.get === "function" && typeof value.set === "function";
  }

  // packages/alpinejs/src/directives/x-cloak.js
  directive("cloak", (el) => queueMicrotask(() => mutateDom(() => el.removeAttribute(prefix("cloak")))));

  // packages/alpinejs/src/directives/x-init.js
  addInitSelector(() => `[${prefix("init")}]`);
  directive("init", skipDuringClone((el, { expression }, { evaluate: evaluate2 }) => {
    if (typeof expression === "string") {
      return !!expression.trim() && evaluate2(expression, {}, false);
    }
    return evaluate2(expression, {}, false);
  }));

  // packages/alpinejs/src/directives/x-text.js
  directive("text", (el, { expression }, { effect: effect3, evaluateLater: evaluateLater2 }) => {
    let evaluate2 = evaluateLater2(expression);
    effect3(() => {
      evaluate2((value) => {
        mutateDom(() => {
          el.textContent = value;
        });
      });
    });
  });

  // packages/alpinejs/src/directives/x-html.js
  directive("html", (el, { expression }, { effect: effect3, evaluateLater: evaluateLater2 }) => {
    let evaluate2 = evaluateLater2(expression);
    effect3(() => {
      evaluate2((value) => {
        mutateDom(() => {
          el.innerHTML = value;
          el._x_ignoreSelf = true;
          initTree(el);
          delete el._x_ignoreSelf;
        });
      });
    });
  });

  // packages/alpinejs/src/directives/x-bind.js
  mapAttributes(startingWith(":", into(prefix("bind:"))));
  var handler2 = (el, { value, modifiers, expression, original }, { effect: effect3, cleanup: cleanup2 }) => {
    if (!value) {
      let bindingProviders = {};
      injectBindingProviders(bindingProviders);
      let getBindings = evaluateLater(el, expression);
      getBindings((bindings) => {
        applyBindingsObject(el, bindings, original);
      }, { scope: bindingProviders });
      return;
    }
    if (value === "key")
      return storeKeyForXFor(el, expression);
    if (el._x_inlineBindings && el._x_inlineBindings[value] && el._x_inlineBindings[value].extract) {
      return;
    }
    let evaluate2 = evaluateLater(el, expression);
    effect3(() => evaluate2((result) => {
      if (result === void 0 && typeof expression === "string" && expression.match(/\./)) {
        result = "";
      }
      mutateDom(() => bind(el, value, result, modifiers));
    }));
    cleanup2(() => {
      el._x_undoAddedClasses && el._x_undoAddedClasses();
      el._x_undoAddedStyles && el._x_undoAddedStyles();
    });
  };
  handler2.inline = (el, { value, modifiers, expression }) => {
    if (!value)
      return;
    if (!el._x_inlineBindings)
      el._x_inlineBindings = {};
    el._x_inlineBindings[value] = { expression, extract: false };
  };
  directive("bind", handler2);
  function storeKeyForXFor(el, expression) {
    el._x_keyExpression = expression;
  }

  // packages/alpinejs/src/directives/x-data.js
  addRootSelector(() => `[${prefix("data")}]`);
  directive("data", (el, { expression }, { cleanup: cleanup2 }) => {
    if (shouldSkipRegisteringDataDuringClone(el))
      return;
    expression = expression === "" ? "{}" : expression;
    let magicContext = {};
    injectMagics(magicContext, el);
    let dataProviderContext = {};
    injectDataProviders(dataProviderContext, magicContext);
    let data2 = evaluate(el, expression, { scope: dataProviderContext });
    if (data2 === void 0 || data2 === true)
      data2 = {};
    injectMagics(data2, el);
    let reactiveData = reactive(data2);
    initInterceptors(reactiveData);
    let undo = addScopeToNode(el, reactiveData);
    reactiveData["init"] && evaluate(el, reactiveData["init"]);
    cleanup2(() => {
      reactiveData["destroy"] && evaluate(el, reactiveData["destroy"]);
      undo();
    });
  });
  interceptClone((from, to) => {
    if (from._x_dataStack) {
      to._x_dataStack = from._x_dataStack;
      to.setAttribute("data-has-alpine-state", true);
    }
  });
  function shouldSkipRegisteringDataDuringClone(el) {
    if (!isCloning)
      return false;
    if (isCloningLegacy)
      return true;
    return el.hasAttribute("data-has-alpine-state");
  }

  // packages/alpinejs/src/directives/x-show.js
  directive("show", (el, { modifiers, expression }, { effect: effect3 }) => {
    let evaluate2 = evaluateLater(el, expression);
    if (!el._x_doHide)
      el._x_doHide = () => {
        mutateDom(() => {
          el.style.setProperty("display", "none", modifiers.includes("important") ? "important" : void 0);
        });
      };
    if (!el._x_doShow)
      el._x_doShow = () => {
        mutateDom(() => {
          if (el.style.length === 1 && el.style.display === "none") {
            el.removeAttribute("style");
          } else {
            el.style.removeProperty("display");
          }
        });
      };
    let hide = () => {
      el._x_doHide();
      el._x_isShown = false;
    };
    let show = () => {
      el._x_doShow();
      el._x_isShown = true;
    };
    let clickAwayCompatibleShow = () => setTimeout(show);
    let toggle = once(
      (value) => value ? show() : hide(),
      (value) => {
        if (typeof el._x_toggleAndCascadeWithTransitions === "function") {
          el._x_toggleAndCascadeWithTransitions(el, value, show, hide);
        } else {
          value ? clickAwayCompatibleShow() : hide();
        }
      }
    );
    let oldValue;
    let firstTime = true;
    effect3(() => evaluate2((value) => {
      if (!firstTime && value === oldValue)
        return;
      if (modifiers.includes("immediate"))
        value ? clickAwayCompatibleShow() : hide();
      toggle(value);
      oldValue = value;
      firstTime = false;
    }));
  });

  // packages/alpinejs/src/directives/x-for.js
  directive("for", (el, { expression }, { effect: effect3, cleanup: cleanup2 }) => {
    let iteratorNames = parseForExpression(expression);
    let evaluateItems = evaluateLater(el, iteratorNames.items);
    let evaluateKey = evaluateLater(
      el,
      // the x-bind:key expression is stored for our use instead of evaluated.
      el._x_keyExpression || "index"
    );
    el._x_prevKeys = [];
    el._x_lookup = {};
    effect3(() => loop(el, iteratorNames, evaluateItems, evaluateKey));
    cleanup2(() => {
      Object.values(el._x_lookup).forEach((el2) => el2.remove());
      delete el._x_prevKeys;
      delete el._x_lookup;
    });
  });
  function loop(el, iteratorNames, evaluateItems, evaluateKey) {
    let isObject2 = (i) => typeof i === "object" && !Array.isArray(i);
    let templateEl = el;
    evaluateItems((items) => {
      if (isNumeric3(items) && items >= 0) {
        items = Array.from(Array(items).keys(), (i) => i + 1);
      }
      if (items === void 0)
        items = [];
      let lookup = el._x_lookup;
      let prevKeys = el._x_prevKeys;
      let scopes = [];
      let keys = [];
      if (isObject2(items)) {
        items = Object.entries(items).map(([key, value]) => {
          let scope2 = getIterationScopeVariables(iteratorNames, value, key, items);
          evaluateKey((value2) => {
            if (keys.includes(value2))
              warn("Duplicate key on x-for", el);
            keys.push(value2);
          }, { scope: { index: key, ...scope2 } });
          scopes.push(scope2);
        });
      } else {
        for (let i = 0; i < items.length; i++) {
          let scope2 = getIterationScopeVariables(iteratorNames, items[i], i, items);
          evaluateKey((value) => {
            if (keys.includes(value))
              warn("Duplicate key on x-for", el);
            keys.push(value);
          }, { scope: { index: i, ...scope2 } });
          scopes.push(scope2);
        }
      }
      let adds = [];
      let moves = [];
      let removes = [];
      let sames = [];
      for (let i = 0; i < prevKeys.length; i++) {
        let key = prevKeys[i];
        if (keys.indexOf(key) === -1)
          removes.push(key);
      }
      prevKeys = prevKeys.filter((key) => !removes.includes(key));
      let lastKey = "template";
      for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        let prevIndex = prevKeys.indexOf(key);
        if (prevIndex === -1) {
          prevKeys.splice(i, 0, key);
          adds.push([lastKey, i]);
        } else if (prevIndex !== i) {
          let keyInSpot = prevKeys.splice(i, 1)[0];
          let keyForSpot = prevKeys.splice(prevIndex - 1, 1)[0];
          prevKeys.splice(i, 0, keyForSpot);
          prevKeys.splice(prevIndex, 0, keyInSpot);
          moves.push([keyInSpot, keyForSpot]);
        } else {
          sames.push(key);
        }
        lastKey = key;
      }
      for (let i = 0; i < removes.length; i++) {
        let key = removes[i];
        if (!!lookup[key]._x_effects) {
          lookup[key]._x_effects.forEach(dequeueJob);
        }
        lookup[key].remove();
        lookup[key] = null;
        delete lookup[key];
      }
      for (let i = 0; i < moves.length; i++) {
        let [keyInSpot, keyForSpot] = moves[i];
        let elInSpot = lookup[keyInSpot];
        let elForSpot = lookup[keyForSpot];
        let marker = document.createElement("div");
        mutateDom(() => {
          if (!elForSpot)
            warn(`x-for ":key" is undefined or invalid`, templateEl, keyForSpot, lookup);
          elForSpot.after(marker);
          elInSpot.after(elForSpot);
          elForSpot._x_currentIfEl && elForSpot.after(elForSpot._x_currentIfEl);
          marker.before(elInSpot);
          elInSpot._x_currentIfEl && elInSpot.after(elInSpot._x_currentIfEl);
          marker.remove();
        });
        elForSpot._x_refreshXForScope(scopes[keys.indexOf(keyForSpot)]);
      }
      for (let i = 0; i < adds.length; i++) {
        let [lastKey2, index] = adds[i];
        let lastEl = lastKey2 === "template" ? templateEl : lookup[lastKey2];
        if (lastEl._x_currentIfEl)
          lastEl = lastEl._x_currentIfEl;
        let scope2 = scopes[index];
        let key = keys[index];
        let clone2 = document.importNode(templateEl.content, true).firstElementChild;
        let reactiveScope = reactive(scope2);
        addScopeToNode(clone2, reactiveScope, templateEl);
        clone2._x_refreshXForScope = (newScope) => {
          Object.entries(newScope).forEach(([key2, value]) => {
            reactiveScope[key2] = value;
          });
        };
        mutateDom(() => {
          lastEl.after(clone2);
          skipDuringClone(() => initTree(clone2))();
        });
        if (typeof key === "object") {
          warn("x-for key cannot be an object, it must be a string or an integer", templateEl);
        }
        lookup[key] = clone2;
      }
      for (let i = 0; i < sames.length; i++) {
        lookup[sames[i]]._x_refreshXForScope(scopes[keys.indexOf(sames[i])]);
      }
      templateEl._x_prevKeys = keys;
    });
  }
  function parseForExpression(expression) {
    let forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/;
    let stripParensRE = /^\s*\(|\)\s*$/g;
    let forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/;
    let inMatch = expression.match(forAliasRE);
    if (!inMatch)
      return;
    let res = {};
    res.items = inMatch[2].trim();
    let item = inMatch[1].replace(stripParensRE, "").trim();
    let iteratorMatch = item.match(forIteratorRE);
    if (iteratorMatch) {
      res.item = item.replace(forIteratorRE, "").trim();
      res.index = iteratorMatch[1].trim();
      if (iteratorMatch[2]) {
        res.collection = iteratorMatch[2].trim();
      }
    } else {
      res.item = item;
    }
    return res;
  }
  function getIterationScopeVariables(iteratorNames, item, index, items) {
    let scopeVariables = {};
    if (/^\[.*\]$/.test(iteratorNames.item) && Array.isArray(item)) {
      let names = iteratorNames.item.replace("[", "").replace("]", "").split(",").map((i) => i.trim());
      names.forEach((name, i) => {
        scopeVariables[name] = item[i];
      });
    } else if (/^\{.*\}$/.test(iteratorNames.item) && !Array.isArray(item) && typeof item === "object") {
      let names = iteratorNames.item.replace("{", "").replace("}", "").split(",").map((i) => i.trim());
      names.forEach((name) => {
        scopeVariables[name] = item[name];
      });
    } else {
      scopeVariables[iteratorNames.item] = item;
    }
    if (iteratorNames.index)
      scopeVariables[iteratorNames.index] = index;
    if (iteratorNames.collection)
      scopeVariables[iteratorNames.collection] = items;
    return scopeVariables;
  }
  function isNumeric3(subject) {
    return !Array.isArray(subject) && !isNaN(subject);
  }

  // packages/alpinejs/src/directives/x-ref.js
  function handler3() {
  }
  handler3.inline = (el, { expression }, { cleanup: cleanup2 }) => {
    let root = closestRoot(el);
    if (!root._x_refs)
      root._x_refs = {};
    root._x_refs[expression] = el;
    cleanup2(() => delete root._x_refs[expression]);
  };
  directive("ref", handler3);

  // packages/alpinejs/src/directives/x-if.js
  directive("if", (el, { expression }, { effect: effect3, cleanup: cleanup2 }) => {
    if (el.tagName.toLowerCase() !== "template")
      warn("x-if can only be used on a <template> tag", el);
    let evaluate2 = evaluateLater(el, expression);
    let show = () => {
      if (el._x_currentIfEl)
        return el._x_currentIfEl;
      let clone2 = el.content.cloneNode(true).firstElementChild;
      addScopeToNode(clone2, {}, el);
      mutateDom(() => {
        el.after(clone2);
        skipDuringClone(() => initTree(clone2))();
      });
      el._x_currentIfEl = clone2;
      el._x_undoIf = () => {
        walk(clone2, (node) => {
          if (!!node._x_effects) {
            node._x_effects.forEach(dequeueJob);
          }
        });
        clone2.remove();
        delete el._x_currentIfEl;
      };
      return clone2;
    };
    let hide = () => {
      if (!el._x_undoIf)
        return;
      el._x_undoIf();
      delete el._x_undoIf;
    };
    effect3(() => evaluate2((value) => {
      value ? show() : hide();
    }));
    cleanup2(() => el._x_undoIf && el._x_undoIf());
  });

  // packages/alpinejs/src/directives/x-id.js
  directive("id", (el, { expression }, { evaluate: evaluate2 }) => {
    let names = evaluate2(expression);
    names.forEach((name) => setIdRoot(el, name));
  });
  interceptClone((from, to) => {
    if (from._x_ids) {
      to._x_ids = from._x_ids;
    }
  });

  // packages/alpinejs/src/directives/x-on.js
  mapAttributes(startingWith("@", into(prefix("on:"))));
  directive("on", skipDuringClone((el, { value, modifiers, expression }, { cleanup: cleanup2 }) => {
    let evaluate2 = expression ? evaluateLater(el, expression) : () => {
    };
    if (el.tagName.toLowerCase() === "template") {
      if (!el._x_forwardEvents)
        el._x_forwardEvents = [];
      if (!el._x_forwardEvents.includes(value))
        el._x_forwardEvents.push(value);
    }
    let removeListener = on(el, value, modifiers, (e) => {
      evaluate2(() => {
      }, { scope: { "$event": e }, params: [e] });
    });
    cleanup2(() => removeListener());
  }));

  // packages/alpinejs/src/directives/index.js
  warnMissingPluginDirective("Collapse", "collapse", "collapse");
  warnMissingPluginDirective("Intersect", "intersect", "intersect");
  warnMissingPluginDirective("Focus", "trap", "focus");
  warnMissingPluginDirective("Mask", "mask", "mask");
  function warnMissingPluginDirective(name, directiveName, slug) {
    directive(directiveName, (el) => warn(`You can't use [x-${directiveName}] without first installing the "${name}" plugin here: https://alpinejs.dev/plugins/${slug}`, el));
  }

  // packages/alpinejs/src/index.js
  alpine_default.setEvaluator(normalEvaluator);
  alpine_default.setReactivityEngine({ reactive: reactive2, effect: effect2, release: stop, raw: toRaw });
  var src_default = alpine_default;

  // packages/alpinejs/builds/cdn.js
  window.Alpine = src_default;
  queueMicrotask(() => {
    src_default.start();
  });
})();



function r(n,t){for(var i=0;i<t.length;i++){var r=t[i];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(n,r.key,r)}}function Jt(n,t,i){t&&r(n.prototype,t),i&&r(n,i),Object.defineProperty(n,"prototype",{writable:!1})}
/*!
 * Splide.js
 * Version  : 4.1.4
 * License  : MIT
 * Copyright: 2022 Naotoshi Fujita
 */
var n,t;n=this,t=function(){"use strict";var v="(prefers-reduced-motion: reduce)",G=4,rn=5,r={CREATED:1,MOUNTED:2,IDLE:3,MOVING:G,SCROLLING:rn,DRAGGING:6,DESTROYED:7};function D(n){n.length=0}function o(n,t,i){return Array.prototype.slice.call(n,t,i)}function R(n){return n.bind.apply(n,[null].concat(o(arguments,1)))}function on(){}var p=setTimeout;function h(n){return requestAnimationFrame(n)}function u(n,t){return typeof t===n}function un(n){return!c(n)&&u("object",n)}var e=Array.isArray,x=R(u,"function"),C=R(u,"string"),en=R(u,"undefined");function c(n){return null===n}function m(n){try{return n instanceof(n.ownerDocument.defaultView||window).HTMLElement}catch(n){return!1}}function y(n){return e(n)?n:[n]}function g(n,t){y(n).forEach(t)}function b(n,t){return-1<n.indexOf(t)}function k(n,t){return n.push.apply(n,y(t)),n}function A(t,n,i){t&&g(n,function(n){n&&t.classList[i?"add":"remove"](n)})}function M(n,t){A(n,C(t)?t.split(" "):t,!0)}function L(n,t){g(t,n.appendChild.bind(n))}function O(n,i){g(n,function(n){var t=(i||n).parentNode;t&&t.insertBefore(n,i)})}function cn(n,t){return m(n)&&(n.msMatchesSelector||n.matches).call(n,t)}function S(n,t){n=n?o(n.children):[];return t?n.filter(function(n){return cn(n,t)}):n}function fn(n,t){return t?S(n,t)[0]:n.firstElementChild}var E=Object.keys;function w(t,i,n){t&&(n?E(t).reverse():E(t)).forEach(function(n){"__proto__"!==n&&i(t[n],n)})}function an(r){return o(arguments,1).forEach(function(i){w(i,function(n,t){r[t]=i[t]})}),r}function d(i){return o(arguments,1).forEach(function(n){w(n,function(n,t){e(n)?i[t]=n.slice():un(n)?i[t]=d({},un(i[t])?i[t]:{},n):i[t]=n})}),i}function sn(t,n){g(n||E(t),function(n){delete t[n]})}function P(n,i){g(n,function(t){g(i,function(n){t&&t.removeAttribute(n)})})}function I(i,t,r){un(t)?w(t,function(n,t){I(i,t,n)}):g(i,function(n){c(r)||""===r?P(n,t):n.setAttribute(t,String(r))})}function j(n,t,i){n=document.createElement(n);return t&&(C(t)?M:I)(n,t),i&&L(i,n),n}function _(n,t,i){if(en(i))return getComputedStyle(n)[t];c(i)||(n.style[t]=""+i)}function ln(n,t){_(n,"display",t)}function dn(n){n.setActive&&n.setActive()||n.focus({preventScroll:!0})}function z(n,t){return n.getAttribute(t)}function vn(n,t){return n&&n.classList.contains(t)}function N(n){return n.getBoundingClientRect()}function T(n){g(n,function(n){n&&n.parentNode&&n.parentNode.removeChild(n)})}function hn(n){return fn((new DOMParser).parseFromString(n,"text/html").body)}function F(n,t){n.preventDefault(),t&&(n.stopPropagation(),n.stopImmediatePropagation())}function pn(n,t){return n&&n.querySelector(t)}function gn(n,t){return t?o(n.querySelectorAll(t)):[]}function X(n,t){A(n,t,!1)}function mn(n){return n.timeStamp}function W(n){return C(n)?n:n?n+"px":""}var yn="splide",f="data-"+yn;function bn(n,t){if(!n)throw new Error("["+yn+"] "+(t||""))}var Y=Math.min,wn=Math.max,xn=Math.floor,kn=Math.ceil,U=Math.abs;function Sn(n,t,i){return U(n-t)<i}function En(n,t,i,r){var o=Y(t,i),t=wn(t,i);return r?o<n&&n<t:o<=n&&n<=t}function q(n,t,i){var r=Y(t,i),t=wn(t,i);return Y(wn(r,n),t)}function Ln(n){return(0<n)-(n<0)}function On(t,n){return g(n,function(n){t=t.replace("%s",""+n)}),t}function An(n){return n<10?"0"+n:""+n}var _n={};function zn(){var c=[];function i(n,i,r){g(n,function(t){t&&g(i,function(n){n.split(" ").forEach(function(n){n=n.split(".");r(t,n[0],n[1])})})})}return{bind:function(n,t,u,e){i(n,t,function(n,t,i){var r="addEventListener"in n,o=r?n.removeEventListener.bind(n,t,u,e):n.removeListener.bind(n,u);r?n.addEventListener(t,u,e):n.addListener(u),c.push([n,t,i,u,o])})},unbind:function(n,t,o){i(n,t,function(t,i,r){c=c.filter(function(n){return!!(n[0]!==t||n[1]!==i||n[2]!==r||o&&n[3]!==o)||(n[4](),!1)})})},dispatch:function(n,t,i){var r;return"function"==typeof CustomEvent?r=new CustomEvent(t,{bubbles:!0,detail:i}):(r=document.createEvent("CustomEvent")).initCustomEvent(t,!0,!1,i),n.dispatchEvent(r),r},destroy:function(){c.forEach(function(n){n[4]()}),D(c)}}}var B="mounted",H="move",Dn="moved",Mn="click",Pn="active",In="inactive",Rn="visible",Cn="hidden",J="refresh",K="updated",jn="resize",Nn="resized",Tn="scroll",V="scrolled",a="destroy",Gn="navigation:mounted",Fn="autoplay:play",Xn="autoplay:pause",Wn="lazyload:loaded",Yn="sk",Un="sh";function Q(n){var i=n?n.event.bus:document.createDocumentFragment(),r=zn();return n&&n.event.on(a,r.destroy),an(r,{bus:i,on:function(n,t){r.bind(i,y(n).join(" "),function(n){t.apply(t,e(n.detail)?n.detail:[])})},off:R(r.unbind,i),emit:function(n){r.dispatch(i,n,o(arguments,1))}})}function qn(t,n,i,r){var o,u,e=Date.now,c=0,f=!0,a=0;function s(){if(!f){if(c=t?Y((e()-o)/t,1):1,i&&i(c),1<=c&&(n(),o=e(),r&&++a>=r))return l();u=h(s)}}function l(){f=!0}function d(){u&&cancelAnimationFrame(u),f=!(u=c=0)}return{start:function(n){n||d(),o=e()-(n?c*t:0),f=!1,u=h(s)},rewind:function(){o=e(),c=0,i&&i(c)},pause:l,cancel:d,set:function(n){t=n},isPaused:function(){return f}}}function s(n){var t=n;return{set:function(n){t=n},is:function(n){return b(y(n),t)}}}var n="Arrow",Bn=n+"Left",Hn=n+"Right",t=n+"Up",n=n+"Down",Jn="ttb",l={width:["height"],left:["top","right"],right:["bottom","left"],x:["y"],X:["Y"],Y:["X"],ArrowLeft:[t,Hn],ArrowRight:[n,Bn]};var Z="role",$="tabindex",i="aria-",Kn=i+"controls",Vn=i+"current",Qn=i+"selected",nn=i+"label",Zn=i+"labelledby",$n=i+"hidden",nt=i+"orientation",tt=i+"roledescription",it=i+"live",rt=i+"busy",ot=i+"atomic",ut=[Z,$,"disabled",Kn,Vn,nn,Zn,$n,nt,tt],i=yn+"__",et=yn,ct=i+"track",ft=i+"list",at=i+"slide",st=at+"--clone",lt=at+"__container",dt=i+"arrows",vt=i+"arrow",ht=vt+"--prev",pt=vt+"--next",gt=i+"pagination",mt=gt+"__page",yt=i+"progress"+"__bar",bt=i+"toggle",wt=i+"sr",tn="is-active",xt="is-prev",kt="is-next",St="is-visible",Et="is-loading",Lt="is-focus-in",Ot="is-overflow",At=[tn,St,xt,kt,Et,Lt,Ot];var _t="touchstart mousedown",zt="touchmove mousemove",Dt="touchend touchcancel mouseup click";var Mt="slide",Pt="loop",It="fade";function Rt(o,r,t,u){var e,n=Q(o),i=n.on,c=n.emit,f=n.bind,a=o.Components,s=o.root,l=o.options,d=l.isNavigation,v=l.updateOnMove,h=l.i18n,p=l.pagination,g=l.slideFocus,m=a.Direction.resolve,y=z(u,"style"),b=z(u,nn),w=-1<t,x=fn(u,"."+lt);function k(){var n=o.splides.map(function(n){n=n.splide.Components.Slides.getAt(r);return n?n.slide.id:""}).join(" ");I(u,nn,On(h.slideX,(w?t:r)+1)),I(u,Kn,n),I(u,Z,g?"button":""),g&&P(u,tt)}function S(){e||E()}function E(){var n,t,i;e||(n=o.index,(i=L())!==vn(u,tn)&&(A(u,tn,i),I(u,Vn,d&&i||""),c(i?Pn:In,O)),i=function(){if(o.is(It))return L();var n=N(a.Elements.track),t=N(u),i=m("left",!0),r=m("right",!0);return xn(n[i])<=kn(t[i])&&xn(t[r])<=kn(n[r])}(),t=!i&&(!L()||w),o.state.is([G,rn])||I(u,$n,t||""),I(gn(u,l.focusableNodes||""),$,t?-1:""),g&&I(u,$,t?-1:0),i!==vn(u,St)&&(A(u,St,i),c(i?Rn:Cn,O)),i||document.activeElement!==u||(t=a.Slides.getAt(o.index))&&dn(t.slide),A(u,xt,r===n-1),A(u,kt,r===n+1))}function L(){var n=o.index;return n===r||l.cloneStatus&&n===t}var O={index:r,slideIndex:t,slide:u,container:x,isClone:w,mount:function(){w||(u.id=s.id+"-slide"+An(r+1),I(u,Z,p?"tabpanel":"group"),I(u,tt,h.slide),I(u,nn,b||On(h.slideLabel,[r+1,o.length]))),f(u,"click",R(c,Mn,O)),f(u,"keydown",R(c,Yn,O)),i([Dn,Un,V],E),i(Gn,k),v&&i(H,S)},destroy:function(){e=!0,n.destroy(),X(u,At),P(u,ut),I(u,"style",y),I(u,nn,b||"")},update:E,style:function(n,t,i){_(i&&x||u,n,t)},isWithin:function(n,t){return n=U(n-r),(n=w||!l.rewind&&!o.is(Pt)?n:Y(n,o.length-n))<=t}};return O}var Ct=f+"-interval";var jt={passive:!1,capture:!0};var Nt={Spacebar:" ",Right:Hn,Left:Bn,Up:t,Down:n};function Tt(n){return n=C(n)?n:n.key,Nt[n]||n}var Gt="keydown";var Ft=f+"-lazy",Xt=Ft+"-srcset",Wt="["+Ft+"], ["+Xt+"]";var Yt=[" ","Enter"];var Ut=Object.freeze({__proto__:null,Media:function(r,n,o){var u=r.state,t=o.breakpoints||{},e=o.reducedMotion||{},i=zn(),c=[];function f(n){n&&i.destroy()}function a(n,t){t=matchMedia(t);i.bind(t,"change",s),c.push([n,t])}function s(){var n=u.is(7),t=o.direction,i=c.reduce(function(n,t){return d(n,t[1].matches?t[0]:{})},{});sn(o),l(i),o.destroy?r.destroy("completely"===o.destroy):n?(f(!0),r.mount()):t!==o.direction&&r.refresh()}function l(n,t,i){d(o,n),t&&d(Object.getPrototypeOf(o),n),!i&&u.is(1)||r.emit(K,o)}return{setup:function(){var i="min"===o.mediaQuery;E(t).sort(function(n,t){return i?+n-+t:+t-+n}).forEach(function(n){a(t[n],"("+(i?"min":"max")+"-width:"+n+"px)")}),a(e,v),s()},destroy:f,reduce:function(n){matchMedia(v).matches&&(n?d(o,e):sn(o,E(e)))},set:l}},Direction:function(n,t,o){return{resolve:function(n,t,i){var r="rtl"!==(i=i||o.direction)||t?i===Jn?0:-1:1;return l[n]&&l[n][r]||n.replace(/width|left|right/i,function(n,t){n=l[n.toLowerCase()][r]||n;return 0<t?n.charAt(0).toUpperCase()+n.slice(1):n})},orient:function(n){return n*("rtl"===o.direction?1:-1)}}},Elements:function(n,t,i){var r,o,u,e=Q(n),c=e.on,f=e.bind,a=n.root,s=i.i18n,l={},d=[],v=[],h=[];function p(){r=y("."+ct),o=fn(r,"."+ft),bn(r&&o,"A track/list element is missing."),k(d,S(o,"."+at+":not(."+st+")")),w({arrows:dt,pagination:gt,prev:ht,next:pt,bar:yt,toggle:bt},function(n,t){l[t]=y("."+n)}),an(l,{root:a,track:r,list:o,slides:d});var n=a.id||function(n){return""+n+An(_n[n]=(_n[n]||0)+1)}(yn),t=i.role;a.id=n,r.id=r.id||n+"-track",o.id=o.id||n+"-list",!z(a,Z)&&"SECTION"!==a.tagName&&t&&I(a,Z,t),I(a,tt,s.carousel),I(o,Z,"presentation"),m()}function g(n){var t=ut.concat("style");D(d),X(a,v),X(r,h),P([r,o],t),P(a,n?t:["style",tt])}function m(){X(a,v),X(r,h),v=b(et),h=b(ct),M(a,v),M(r,h),I(a,nn,i.label),I(a,Zn,i.labelledby)}function y(n){n=pn(a,n);return n&&function(n,t){if(x(n.closest))return n.closest(t);for(var i=n;i&&1===i.nodeType&&!cn(i,t);)i=i.parentElement;return i}(n,"."+et)===a?n:void 0}function b(n){return[n+"--"+i.type,n+"--"+i.direction,i.drag&&n+"--draggable",i.isNavigation&&n+"--nav",n===et&&tn]}return an(l,{setup:p,mount:function(){c(J,g),c(J,p),c(K,m),f(document,_t+" keydown",function(n){u="keydown"===n.type},{capture:!0}),f(a,"focusin",function(){A(a,Lt,!!u)})},destroy:g})},Slides:function(r,o,u){var n=Q(r),t=n.on,e=n.emit,c=n.bind,f=(n=o.Elements).slides,a=n.list,s=[];function i(){f.forEach(function(n,t){d(n,t,-1)})}function l(){h(function(n){n.destroy()}),D(s)}function d(n,t,i){t=Rt(r,t,i,n);t.mount(),s.push(t),s.sort(function(n,t){return n.index-t.index})}function v(n){return n?p(function(n){return!n.isClone}):s}function h(n,t){v(t).forEach(n)}function p(t){return s.filter(x(t)?t:function(n){return C(t)?cn(n.slide,t):b(y(t),n.index)})}return{mount:function(){i(),t(J,l),t(J,i)},destroy:l,update:function(){h(function(n){n.update()})},register:d,get:v,getIn:function(n){var t=o.Controller,i=t.toIndex(n),r=t.hasFocus()?1:u.perPage;return p(function(n){return En(n.index,i,i+r-1)})},getAt:function(n){return p(n)[0]},add:function(n,o){g(n,function(n){var t,i,r;m(n=C(n)?hn(n):n)&&((t=f[o])?O(n,t):L(a,n),M(n,u.classes.slide),t=n,i=R(e,jn),t=gn(t,"img"),(r=t.length)?t.forEach(function(n){c(n,"load error",function(){--r||i()})}):i())}),e(J)},remove:function(n){T(p(n).map(function(n){return n.slide})),e(J)},forEach:h,filter:p,style:function(t,i,r){h(function(n){n.style(t,i,r)})},getLength:function(n){return(n?f:s).length},isEnough:function(){return s.length>u.perPage}}},Layout:function(t,n,i){var r,o,u,e=(a=Q(t)).on,c=a.bind,f=a.emit,a=n.Slides,s=n.Direction.resolve,l=(n=n.Elements).root,d=n.track,v=n.list,h=a.getAt,p=a.style;function g(){r=i.direction===Jn,_(l,"maxWidth",W(i.width)),_(d,s("paddingLeft"),y(!1)),_(d,s("paddingRight"),y(!0)),m(!0)}function m(n){var t=N(l);!n&&o.width===t.width&&o.height===t.height||(_(d,"height",function(){var n="";r&&(bn(n=b(),"height or heightRatio is missing."),n="calc("+n+" - "+y(!1)+" - "+y(!0)+")");return n}()),p(s("marginRight"),W(i.gap)),p("width",i.autoWidth?null:W(i.fixedWidth)||(r?"":w())),p("height",W(i.fixedHeight)||(r?i.autoHeight?null:w():b()),!0),o=t,f(Nn),u!==(u=O())&&(A(l,Ot,u),f("overflow",u)))}function y(n){var t=i.padding,n=s(n?"right":"left");return t&&W(t[n]||(un(t)?0:t))||"0px"}function b(){return W(i.height||N(v).width*i.heightRatio)}function w(){var n=W(i.gap);return"calc((100%"+(n&&" + "+n)+")/"+(i.perPage||1)+(n&&" - "+n)+")"}function x(){return N(v)[s("width")]}function k(n,t){n=h(n||0);return n?N(n.slide)[s("width")]+(t?0:L()):0}function S(n,t){var i,n=h(n);return n?(n=N(n.slide)[s("right")],i=N(v)[s("left")],U(n-i)+(t?0:L())):0}function E(n){return S(t.length-1)-S(0)+k(0,n)}function L(){var n=h(0);return n&&parseFloat(_(n.slide,s("marginRight")))||0}function O(){return t.is(It)||E(!0)>x()}return{mount:function(){var n,t,i;g(),c(window,"resize load",(n=R(f,jn),i=qn(t||0,n,null,1),function(){i.isPaused()&&i.start()})),e([K,J],g),e(jn,m)},resize:m,listSize:x,slideSize:k,sliderSize:E,totalSize:S,getPadding:function(n){return parseFloat(_(d,s("padding"+(n?"Right":"Left"))))||0},isOverflow:O}},Clones:function(c,i,f){var t,r=Q(c),n=r.on,a=i.Elements,s=i.Slides,o=i.Direction.resolve,l=[];function u(){if(n(J,d),n([K,jn],v),t=h()){var o=t,u=s.get().slice(),e=u.length;if(e){for(;u.length<o;)k(u,u);k(u.slice(-o),u.slice(0,o)).forEach(function(n,t){var i=t<o,r=function(n,t){n=n.cloneNode(!0);return M(n,f.classes.clone),n.id=c.root.id+"-clone"+An(t+1),n}(n.slide,t);i?O(r,u[0].slide):L(a.list,r),k(l,r),s.register(r,t-o+(i?0:e),n.index)})}i.Layout.resize(!0)}}function d(){e(),u()}function e(){T(l),D(l),r.destroy()}function v(){var n=h();t!==n&&(t<n||!n)&&r.emit(J)}function h(){var n,t=f.clones;return c.is(Pt)?en(t)&&(t=(n=f[o("fixedWidth")]&&i.Layout.slideSize(0))&&kn(N(a.track)[o("width")]/n)||f[o("autoWidth")]&&c.length||2*f.perPage):t=0,t}return{mount:u,destroy:e}},Move:function(r,c,o){var e,n=Q(r),t=n.on,f=n.emit,a=r.state.set,u=(n=c.Layout).slideSize,i=n.getPadding,s=n.totalSize,l=n.listSize,d=n.sliderSize,v=(n=c.Direction).resolve,h=n.orient,p=(n=c.Elements).list,g=n.track;function m(){c.Controller.isBusy()||(c.Scroll.cancel(),y(r.index),c.Slides.update())}function y(n){b(S(n,!0))}function b(n,t){r.is(It)||(t=t?n:function(n){{var t,i;r.is(Pt)&&(t=k(n),i=t>c.Controller.getEnd(),(t<0||i)&&(n=w(n,i)))}return n}(n),_(p,"transform","translate"+v("X")+"("+t+"px)"),n!==t&&f(Un))}function w(n,t){var i=n-L(t),r=d();return n-=h(r*(kn(U(i)/r)||1))*(t?1:-1)}function x(){b(E(),!0),e.cancel()}function k(n){for(var t=c.Slides.get(),i=0,r=1/0,o=0;o<t.length;o++){var u=t[o].index,e=U(S(u,!0)-n);if(!(e<=r))break;r=e,i=u}return i}function S(n,t){var i=h(s(n-1)-(n=n,"center"===(i=o.focus)?(l()-u(n,!0))/2:+i*u(n)||0));return t?(n=i,n=o.trimSpace&&r.is(Mt)?q(n,0,h(d(!0)-l())):n):i}function E(){var n=v("left");return N(p)[n]-N(g)[n]+h(i(!1))}function L(n){return S(n?c.Controller.getEnd():0,!!o.trimSpace)}return{mount:function(){e=c.Transition,t([B,Nn,K,J],m)},move:function(n,t,i,r){var o,u;n!==t&&(o=i<n,u=h(w(E(),o)),o?0<=u:u<=p[v("scrollWidth")]-N(g)[v("width")])&&(x(),b(w(E(),i<n),!0)),a(G),f(H,t,i,n),e.start(t,function(){a(3),f(Dn,t,i,n),r&&r()})},jump:y,translate:b,shift:w,cancel:x,toIndex:k,toPosition:S,getPosition:E,getLimit:L,exceededLimit:function(n,t){t=en(t)?E():t;var i=!0!==n&&h(t)<h(L(!1)),n=!1!==n&&h(t)>h(L(!0));return i||n},reposition:m}},Controller:function(o,u,e){var c,f,a,s,n=Q(o),t=n.on,i=n.emit,l=u.Move,d=l.getPosition,r=l.getLimit,v=l.toPosition,h=(n=u.Slides).isEnough,p=n.getLength,g=e.omitEnd,m=o.is(Pt),y=o.is(Mt),b=R(L,!1),w=R(L,!0),x=e.start||0,k=x;function S(){f=p(!0),a=e.perMove,s=e.perPage,c=_();var n=q(x,0,g?c:f-1);n!==x&&(x=n,l.reposition())}function E(){c!==_()&&i("ei")}function L(n,t){var i=a||(P()?1:s),i=O(x+i*(n?-1:1),x,!(a||P()));return-1===i&&y&&!Sn(d(),r(!n),1)?n?0:c:t?i:A(i)}function O(n,t,i){var r;return h()||P()?((r=function(n){if(y&&"move"===e.trimSpace&&n!==x)for(var t=d();t===v(n,!0)&&En(n,0,o.length-1,!e.rewind);)n<x?--n:++n;return n}(n))!==n&&(t=n,n=r,i=!1),n<0||c<n?n=a||!En(0,n,t,!0)&&!En(c,t,n,!0)?m?i?n<0?-(f%s||s):f:n:e.rewind?n<0?c:0:-1:z(D(n)):i&&n!==t&&(n=z(D(t)+(n<t?-1:1)))):n=-1,n}function A(n){return m?(n+f)%f||0:n}function _(){for(var n=f-(P()||m&&a?1:s);g&&0<n--;)if(v(f-1,!0)!==v(n,!0)){n++;break}return q(n,0,f-1)}function z(n){return q(P()?n:s*n,0,c)}function D(n){return P()?Y(n,c):xn((c<=n?f-1:n)/s)}function M(n){n!==x&&(k=x,x=n)}function P(){return!en(e.focus)||e.isNavigation}function I(){return o.state.is([G,rn])&&!!e.waitForTransition}return{mount:function(){S(),t([K,J,"ei"],S),t(Nn,E)},go:function(n,t,i){var r;I()||-1<(r=A(n=function(n){var t=x;{var i,r;C(n)?(r=n.match(/([+\-<>])(\d+)?/)||[],i=r[1],r=r[2],"+"===i||"-"===i?t=O(x+ +(""+i+(+r||1)),x):">"===i?t=r?z(+r):b(!0):"<"===i&&(t=w(!0))):t=m?n:q(n,0,c)}return t}(n)))&&(t||r!==x)&&(M(r),l.move(n,r,k,i))},scroll:function(n,t,i,r){u.Scroll.scroll(n,t,i,function(){var n=A(l.toIndex(d()));M(g?Y(n,c):n),r&&r()})},getNext:b,getPrev:w,getAdjacent:L,getEnd:_,setIndex:M,getIndex:function(n){return n?k:x},toIndex:z,toPage:D,toDest:function(n){return n=l.toIndex(n),y?q(n,0,c):n},hasFocus:P,isBusy:I}},Arrows:function(o,n,t){var i,r,u=Q(o),e=u.on,c=u.bind,f=u.emit,a=t.classes,s=t.i18n,l=n.Elements,d=n.Controller,v=l.arrows,h=l.track,p=v,g=l.prev,m=l.next,y={};function b(){var n=t.arrows;!n||g&&m||(p=v||j("div",a.arrows),g=S(!0),m=S(!1),i=!0,L(p,[g,m]),v||O(p,h)),g&&m&&(an(y,{prev:g,next:m}),ln(p,n?"":"none"),M(p,r=dt+"--"+t.direction),n&&(e([B,Dn,J,V,"ei"],E),c(m,"click",R(k,">")),c(g,"click",R(k,"<")),E(),I([g,m],Kn,h.id),f("arrows:mounted",g,m))),e(K,w)}function w(){x(),b()}function x(){u.destroy(),X(p,r),i?(T(v?[g,m]:p),g=m=null):P([g,m],ut)}function k(n){d.go(n,!0)}function S(n){return hn('<button class="'+a.arrow+" "+(n?a.prev:a.next)+'" type="button"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40" focusable="false"><path d="'+(t.arrowPath||"m15.5 0.932-4.3 4.38 14.5 14.6-14.5 14.5 4.3 4.4 14.6-14.6 4.4-4.3-4.4-4.4-14.6-14.6z")+'" />')}function E(){var n,t,i,r;g&&m&&(r=o.index,n=d.getPrev(),t=d.getNext(),i=-1<n&&r<n?s.last:s.prev,r=-1<t&&t<r?s.first:s.next,g.disabled=n<0,m.disabled=t<0,I(g,nn,i),I(m,nn,r),f("arrows:updated",g,m,n,t))}return{arrows:y,mount:b,destroy:x,update:E}},Autoplay:function(n,t,i){var r,o,u=Q(n),e=u.on,c=u.bind,f=u.emit,a=qn(i.interval,n.go.bind(n,">"),function(n){var t=l.bar;t&&_(t,"width",100*n+"%"),f("autoplay:playing",n)}),s=a.isPaused,l=t.Elements,d=(u=t.Elements).root,v=u.toggle,h=i.autoplay,p="pause"===h;function g(){s()&&t.Slides.isEnough()&&(a.start(!i.resetProgress),o=r=p=!1,b(),f(Fn))}function m(n){p=!!(n=void 0===n?!0:n),b(),s()||(a.pause(),f(Xn))}function y(){p||(r||o?m(!1):g())}function b(){v&&(A(v,tn,!p),I(v,nn,i.i18n[p?"play":"pause"]))}function w(n){n=t.Slides.getAt(n);a.set(n&&+z(n.slide,Ct)||i.interval)}return{mount:function(){h&&(i.pauseOnHover&&c(d,"mouseenter mouseleave",function(n){r="mouseenter"===n.type,y()}),i.pauseOnFocus&&c(d,"focusin focusout",function(n){o="focusin"===n.type,y()}),v&&c(v,"click",function(){p?g():m(!0)}),e([H,Tn,J],a.rewind),e(H,w),v&&I(v,Kn,l.track.id),p||g(),b())},destroy:a.cancel,play:g,pause:m,isPaused:s}},Cover:function(n,t,i){var r=Q(n).on;function o(i){t.Slides.forEach(function(n){var t=fn(n.container||n.slide,"img");t&&t.src&&u(i,t,n)})}function u(n,t,i){i.style("background",n?'center/cover no-repeat url("'+t.src+'")':"",!0),ln(t,n?"none":"")}return{mount:function(){i.cover&&(r(Wn,R(u,!0)),r([B,K,J],R(o,!0)))},destroy:R(o,!1)}},Scroll:function(n,c,u){var f,a,t=Q(n),i=t.on,s=t.emit,l=n.state.set,d=c.Move,v=d.getPosition,e=d.getLimit,h=d.exceededLimit,p=d.translate,g=n.is(Mt),m=1;function y(n,t,i,r,o){var u,e=v(),i=(x(),!i||g&&h()||(i=c.Layout.sliderSize(),u=Ln(n)*i*xn(U(n)/i)||0,n=d.toPosition(c.Controller.toDest(n%i))+u),Sn(e,n,1));m=1,t=i?0:t||wn(U(n-e)/1.5,800),a=r,f=qn(t,b,R(w,e,n,o),1),l(rn),s(Tn),f.start()}function b(){l(3),a&&a(),s(V)}function w(n,t,i,r){var o=v(),r=(n+(t-n)*(t=r,(n=u.easingFunc)?n(t):1-Math.pow(1-t,4))-o)*m;p(o+r),g&&!i&&h()&&(m*=.6,U(r)<10&&y(e(h(!0)),600,!1,a,!0))}function x(){f&&f.cancel()}function r(){f&&!f.isPaused()&&(x(),b())}return{mount:function(){i(H,x),i([K,J],r)},destroy:x,scroll:y,cancel:r}},Drag:function(e,o,c){var f,t,u,a,s,l,d,v,n=Q(e),i=n.on,h=n.emit,p=n.bind,g=n.unbind,m=e.state,y=o.Move,b=o.Scroll,w=o.Controller,x=o.Elements.track,k=o.Media.reduce,r=(n=o.Direction).resolve,S=n.orient,E=y.getPosition,L=y.exceededLimit,O=!1;function j(){var n=c.drag;C(!n),a="free"===n}function N(n){var t,i,r;l=!1,d||(t=R(n),i=n.target,r=c.noDrag,cn(i,"."+mt+", ."+vt)||r&&cn(i,r)||!t&&n.button||(w.isBusy()?F(n,!0):(v=t?x:window,s=m.is([G,rn]),u=null,p(v,zt,A,jt),p(v,Dt,_,jt),y.cancel(),b.cancel(),z(n))))}function A(n){var t,i,r,o,u;m.is(6)||(m.set(6),h("drag")),n.cancelable&&(s?(y.translate(f+D(n)/(O&&e.is(Mt)?5:1)),u=200<M(n),t=O!==(O=L()),(u||t)&&z(n),l=!0,h("dragging"),F(n)):U(D(u=n))>U(D(u,!0))&&(t=n,i=c.dragMinThreshold,r=un(i),o=r&&i.mouse||0,r=(r?i.touch:+i)||10,s=U(D(t))>(R(t)?r:o),F(n)))}function _(n){var t,i,r;m.is(6)&&(m.set(3),h("dragged")),s&&(i=function(n){return E()+Ln(n)*Y(U(n)*(c.flickPower||600),a?1/0:o.Layout.listSize()*(c.flickMaxPages||1))}(t=function(n){if(e.is(Pt)||!O){var t=M(n);if(t&&t<200)return D(n)/t}return 0}(t=n)),r=c.rewind&&c.rewindByDrag,k(!1),a?w.scroll(i,0,c.snap):e.is(It)?w.go(S(Ln(t))<0?r?"<":"-":r?">":"+"):e.is(Mt)&&O&&r?w.go(L(!0)?">":"<"):w.go(w.toDest(i),!0),k(!0),F(n)),g(v,zt,A),g(v,Dt,_),s=!1}function T(n){!d&&l&&F(n,!0)}function z(n){u=t,t=n,f=E()}function D(n,t){return I(n,t)-I(P(n),t)}function M(n){return mn(n)-mn(P(n))}function P(n){return t===n&&u||t}function I(n,t){return(R(n)?n.changedTouches[0]:n)["page"+r(t?"Y":"X")]}function R(n){return"undefined"!=typeof TouchEvent&&n instanceof TouchEvent}function C(n){d=n}return{mount:function(){p(x,zt,on,jt),p(x,Dt,on,jt),p(x,_t,N,jt),p(x,"click",T,{capture:!0}),p(x,"dragstart",F),i([B,K],j)},disable:C,isDragging:function(){return s}}},Keyboard:function(t,n,i){var r,o,u=Q(t),e=u.on,c=u.bind,f=u.unbind,a=t.root,s=n.Direction.resolve;function l(){var n=i.keyboard;n&&(r="global"===n?window:a,c(r,Gt,h))}function d(){f(r,Gt)}function v(){var n=o;o=!0,p(function(){o=n})}function h(n){o||((n=Tt(n))===s(Bn)?t.go("<"):n===s(Hn)&&t.go(">"))}return{mount:function(){l(),e(K,d),e(K,l),e(H,v)},destroy:d,disable:function(n){o=n}}},LazyLoad:function(i,n,o){var t=Q(i),r=t.on,u=t.off,e=t.bind,c=t.emit,f="sequential"===o.lazyLoad,a=[Dn,V],s=[];function l(){D(s),n.Slides.forEach(function(r){gn(r.slide,Wt).forEach(function(n){var t=z(n,Ft),i=z(n,Xt);t===n.src&&i===n.srcset||(t=o.classes.spinner,t=fn(i=n.parentElement,"."+t)||j("span",t,i),s.push([n,r,t]),n.src||ln(n,"none"))})}),(f?p:(u(a),r(a,d),d))()}function d(){(s=s.filter(function(n){var t=o.perPage*((o.preloadPages||1)+1)-1;return!n[1].isWithin(i.index,t)||v(n)})).length||u(a)}function v(n){var t=n[0];M(n[1].slide,Et),e(t,"load error",R(h,n)),I(t,"src",z(t,Ft)),I(t,"srcset",z(t,Xt)),P(t,Ft),P(t,Xt)}function h(n,t){var i=n[0],r=n[1];X(r.slide,Et),"error"!==t.type&&(T(n[2]),ln(i,""),c(Wn,i,r),c(jn)),f&&p()}function p(){s.length&&v(s.shift())}return{mount:function(){o.lazyLoad&&(l(),r(J,l))},destroy:R(D,s),check:d}},Pagination:function(l,n,d){var v,h,t=Q(l),p=t.on,g=t.emit,m=t.bind,y=n.Slides,b=n.Elements,w=n.Controller,x=w.hasFocus,r=w.getIndex,e=w.go,c=n.Direction.resolve,k=b.pagination,S=[];function E(){v&&(T(k?o(v.children):v),X(v,h),D(S),v=null),t.destroy()}function L(n){e(">"+n,!0)}function O(n,t){var i=S.length,r=Tt(t),o=A(),u=-1,o=(r===c(Hn,!1,o)?u=++n%i:r===c(Bn,!1,o)?u=(--n+i)%i:"Home"===r?u=0:"End"===r&&(u=i-1),S[u]);o&&(dn(o.button),e(">"+u),F(t,!0))}function A(){return d.paginationDirection||d.direction}function _(n){return S[w.toPage(n)]}function z(){var n,t=_(r(!0)),i=_(r());t&&(X(n=t.button,tn),P(n,Qn),I(n,$,-1)),i&&(M(n=i.button,tn),I(n,Qn,!0),I(n,$,"")),g("pagination:updated",{list:v,items:S},t,i)}return{items:S,mount:function n(){E(),p([K,J,"ei"],n);var t=d.pagination;if(k&&ln(k,t?"":"none"),t){p([H,Tn,V],z);var t=l.length,i=d.classes,r=d.i18n,o=d.perPage,u=x()?w.getEnd()+1:kn(t/o);M(v=k||j("ul",i.pagination,b.track.parentElement),h=gt+"--"+A()),I(v,Z,"tablist"),I(v,nn,r.select),I(v,nt,A()===Jn?"vertical":"");for(var e=0;e<u;e++){var c=j("li",null,v),f=j("button",{class:i.page,type:"button"},c),a=y.getIn(e).map(function(n){return n.slide.id}),s=!x()&&1<o?r.pageX:r.slideX;m(f,"click",R(L,e)),d.paginationKeyboard&&m(f,"keydown",R(O,e)),I(c,Z,"presentation"),I(f,Z,"tab"),I(f,Kn,a.join(" ")),I(f,nn,On(s,e+1)),I(f,$,-1),S.push({li:c,button:f,page:e})}z(),g("pagination:mounted",{list:v,items:S},_(l.index))}},destroy:E,getAt:_,update:z}},Sync:function(i,n,t){var r=t.isNavigation,o=t.slideFocus,u=[];function e(){var n,t;i.splides.forEach(function(n){n.isParent||(f(i,n.splide),f(n.splide,i))}),r&&(n=Q(i),(t=n.on)(Mn,s),t(Yn,l),t([B,K],a),u.push(n),n.emit(Gn,i.splides))}function c(){u.forEach(function(n){n.destroy()}),D(u)}function f(n,r){n=Q(n);n.on(H,function(n,t,i){r.go(r.is(Pt)?i:n)}),u.push(n)}function a(){I(n.Elements.list,nt,t.direction===Jn?"vertical":"")}function s(n){i.go(n.index)}function l(n,t){b(Yt,Tt(t))&&(s(n),F(t))}return{setup:R(n.Media.set,{slideFocus:en(o)?r:o},!0),mount:e,destroy:c,remount:function(){c(),e()}}},Wheel:function(e,c,f){var n=Q(e).bind,a=0;function t(n){var t,i,r,o,u;n.cancelable&&(t=(u=n.deltaY)<0,i=mn(n),r=f.wheelMinThreshold||0,o=f.wheelSleep||0,U(u)>r&&o<i-a&&(e.go(t?"<":">"),a=i),u=t,f.releaseWheel&&!e.state.is(G)&&-1===c.Controller.getAdjacent(u)||F(n))}return{mount:function(){f.wheel&&n(c.Elements.track,"wheel",t,jt)}}},Live:function(n,t,i){var r=Q(n).on,o=t.Elements.track,u=i.live&&!i.isNavigation,e=j("span",wt),c=qn(90,R(f,!1));function f(n){I(o,rt,n),n?(L(o,e),c.start()):(T(e),c.cancel())}function a(n){u&&I(o,it,n?"off":"polite")}return{mount:function(){u&&(a(!t.Autoplay.isPaused()),I(o,ot,!0),e.textContent="…",r(Fn,R(a,!0)),r(Xn,R(a,!1)),r([Dn,V],R(f,!0)))},disable:a,destroy:function(){P(o,[it,ot,rt]),T(e)}}}}),qt={type:"slide",role:"region",speed:400,perPage:1,cloneStatus:!0,arrows:!0,pagination:!0,paginationKeyboard:!0,interval:5e3,pauseOnHover:!0,pauseOnFocus:!0,resetProgress:!0,easing:"cubic-bezier(0.25, 1, 0.5, 1)",drag:!0,direction:"ltr",trimSpace:!0,focusableNodes:"a, button, textarea, input, select, iframe",live:!0,classes:{slide:at,clone:st,arrows:dt,arrow:vt,prev:ht,next:pt,pagination:gt,page:mt,spinner:i+"spinner"},i18n:{prev:"Previous slide",next:"Next slide",first:"Go to first slide",last:"Go to last slide",slideX:"Go to slide %s",pageX:"Go to page %s",play:"Start autoplay",pause:"Pause autoplay",carousel:"carousel",slide:"slide",select:"Select a slide to show",slideLabel:"%s of %s"},reducedMotion:{speed:0,rewindSpeed:0,autoplay:"pause"}};function Bt(n,t,i){var r=t.Slides;function o(){r.forEach(function(n){n.style("transform","translateX(-"+100*n.index+"%)")})}return{mount:function(){Q(n).on([B,J],o)},start:function(n,t){r.style("transition","opacity "+i.speed+"ms "+i.easing),p(t)},cancel:on}}function Ht(u,n,e){var c,f=n.Move,a=n.Controller,s=n.Scroll,t=n.Elements.list,l=R(_,t,"transition");function i(){l(""),s.cancel()}return{mount:function(){Q(u).bind(t,"transitionend",function(n){n.target===t&&c&&(i(),c())})},start:function(n,t){var i=f.toPosition(n,!0),r=f.getPosition(),o=function(n){var t=e.rewindSpeed;if(u.is(Mt)&&t){var i=a.getIndex(!0),r=a.getEnd();if(0===i&&r<=n||r<=i&&0===n)return t}return e.speed}(n);1<=U(i-r)&&1<=o?e.useScroll?s.scroll(i,o,!1,t):(l("transform "+o+"ms "+e.easing),f.translate(i,!0),c=t):(f.jump(n),t())},cancel:i}}t=function(){function i(n,t){this.event=Q(),this.Components={},this.state=s(1),this.splides=[],this.n={},this.t={};n=C(n)?pn(document,n):n;bn(n,n+" is invalid."),t=d({label:z(this.root=n,nn)||"",labelledby:z(n,Zn)||""},qt,i.defaults,t||{});try{d(t,JSON.parse(z(n,f)))}catch(n){bn(!1,"Invalid JSON")}this.n=Object.create(d({},t))}var n=i.prototype;return n.mount=function(n,t){var i=this,r=this.state,o=this.Components;return bn(r.is([1,7]),"Already mounted!"),r.set(1),this.i=o,this.r=t||this.r||(this.is(It)?Bt:Ht),this.t=n||this.t,w(an({},Ut,this.t,{Transition:this.r}),function(n,t){n=n(i,o,i.n);(o[t]=n).setup&&n.setup()}),w(o,function(n){n.mount&&n.mount()}),this.emit(B),M(this.root,"is-initialized"),r.set(3),this.emit("ready"),this},n.sync=function(n){return this.splides.push({splide:n}),n.splides.push({splide:this,isParent:!0}),this.state.is(3)&&(this.i.Sync.remount(),n.Components.Sync.remount()),this},n.go=function(n){return this.i.Controller.go(n),this},n.on=function(n,t){return this.event.on(n,t),this},n.off=function(n){return this.event.off(n),this},n.emit=function(n){var t;return(t=this.event).emit.apply(t,[n].concat(o(arguments,1))),this},n.add=function(n,t){return this.i.Slides.add(n,t),this},n.remove=function(n){return this.i.Slides.remove(n),this},n.is=function(n){return this.n.type===n},n.refresh=function(){return this.emit(J),this},n.destroy=function(t){void 0===t&&(t=!0);var n=this.event,i=this.state;return i.is(1)?Q(this).on("ready",this.destroy.bind(this,t)):(w(this.i,function(n){n.destroy&&n.destroy(t)},!0),n.emit(a),n.destroy(),t&&D(this.splides),i.set(7)),this},Jt(i,[{key:"options",get:function(){return this.n},set:function(n){this.i.Media.set(n,!0,!0)}},{key:"length",get:function(){return this.i.Slides.getLength(!0)}},{key:"index",get:function(){return this.i.Controller.getIndex()}}]),i}();return t.defaults={},t.STATES=r,t},"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):(n="undefined"!=typeof globalThis?globalThis:n||self).Splide=t();
//# sourceMappingURL=splide.min.js.map

(()=>{function g(n){n.directive("collapse",e),e.inline=(t,{modifiers:i})=>{i.includes("min")&&(t._x_doShow=()=>{},t._x_doHide=()=>{})};function e(t,{modifiers:i}){let r=l(i,"duration",250)/1e3,h=l(i,"min",0),u=!i.includes("min");t._x_isShown||(t.style.height=`${h}px`),!t._x_isShown&&u&&(t.hidden=!0),t._x_isShown||(t.style.overflow="hidden");let c=(d,s)=>{let o=n.setStyles(d,s);return s.height?()=>{}:o},f={transitionProperty:"height",transitionDuration:`${r}s`,transitionTimingFunction:"cubic-bezier(0.4, 0.0, 0.2, 1)"};t._x_transition={in(d=()=>{},s=()=>{}){u&&(t.hidden=!1),u&&(t.style.display=null);let o=t.getBoundingClientRect().height;t.style.height="auto";let a=t.getBoundingClientRect().height;o===a&&(o=h),n.transition(t,n.setStyles,{during:f,start:{height:o+"px"},end:{height:a+"px"}},()=>t._x_isShown=!0,()=>{Math.abs(t.getBoundingClientRect().height-a)<1&&(t.style.overflow=null)})},out(d=()=>{},s=()=>{}){let o=t.getBoundingClientRect().height;n.transition(t,c,{during:f,start:{height:o+"px"},end:{height:h+"px"}},()=>t.style.overflow="hidden",()=>{t._x_isShown=!1,t.style.height==`${h}px`&&u&&(t.style.display="none",t.hidden=!0)})}}}}function l(n,e,t){if(n.indexOf(e)===-1)return t;let i=n[n.indexOf(e)+1];if(!i)return t;if(e==="duration"){let r=i.match(/([0-9]+)ms/);if(r)return r[1]}if(e==="min"){let r=i.match(/([0-9]+)px/);if(r)return r[1]}return i}document.addEventListener("alpine:init",()=>{window.Alpine.plugin(g)});})();

(()=>{var _=["input","select","textarea","a[href]","button","[tabindex]:not(slot)","audio[controls]","video[controls]",'[contenteditable]:not([contenteditable="false"])',"details>summary:first-of-type","details"],k=_.join(","),K=typeof Element>"u",N=K?function(){}:Element.prototype.matches||Element.prototype.msMatchesSelector||Element.prototype.webkitMatchesSelector,B=!K&&Element.prototype.getRootNode?function(i){return i.getRootNode()}:function(i){return i.ownerDocument},V=function(e,t,a){var n=Array.prototype.slice.apply(e.querySelectorAll(k));return t&&N.call(e,k)&&n.unshift(e),n=n.filter(a),n},$=function i(e,t,a){for(var n=[],r=Array.from(e);r.length;){var s=r.shift();if(s.tagName==="SLOT"){var l=s.assignedElements(),m=l.length?l:s.children,p=i(m,!0,a);a.flatten?n.push.apply(n,p):n.push({scope:s,candidates:p})}else{var v=N.call(s,k);v&&a.filter(s)&&(t||!e.includes(s))&&n.push(s);var h=s.shadowRoot||typeof a.getShadowRoot=="function"&&a.getShadowRoot(s),y=!a.shadowRootFilter||a.shadowRootFilter(s);if(h&&y){var w=i(h===!0?s.children:h.children,!0,a);a.flatten?n.push.apply(n,w):n.push({scope:s,candidates:w})}else r.unshift.apply(r,s.children)}}return n},Y=function(e,t){return e.tabIndex<0&&(t||/^(AUDIO|VIDEO|DETAILS)$/.test(e.tagName)||e.isContentEditable)&&isNaN(parseInt(e.getAttribute("tabindex"),10))?0:e.tabIndex},se=function(e,t){return e.tabIndex===t.tabIndex?e.documentOrder-t.documentOrder:e.tabIndex-t.tabIndex},Z=function(e){return e.tagName==="INPUT"},ce=function(e){return Z(e)&&e.type==="hidden"},le=function(e){var t=e.tagName==="DETAILS"&&Array.prototype.slice.apply(e.children).some(function(a){return a.tagName==="SUMMARY"});return t},fe=function(e,t){for(var a=0;a<e.length;a++)if(e[a].checked&&e[a].form===t)return e[a]},de=function(e){if(!e.name)return!0;var t=e.form||B(e),a=function(l){return t.querySelectorAll('input[type="radio"][name="'+l+'"]')},n;if(typeof window<"u"&&typeof window.CSS<"u"&&typeof window.CSS.escape=="function")n=a(window.CSS.escape(e.name));else try{n=a(e.name)}catch(s){return console.error("Looks like you have a radio button with a name attribute containing invalid CSS selector characters and need the CSS.escape polyfill: %s",s.message),!1}var r=fe(n,e.form);return!r||r===e},be=function(e){return Z(e)&&e.type==="radio"},ve=function(e){return be(e)&&!de(e)},W=function(e){var t=e.getBoundingClientRect(),a=t.width,n=t.height;return a===0&&n===0},he=function(e,t){var a=t.displayCheck,n=t.getShadowRoot;if(getComputedStyle(e).visibility==="hidden")return!0;var r=N.call(e,"details>summary:first-of-type"),s=r?e.parentElement:e;if(N.call(s,"details:not([open]) *"))return!0;var l=B(e).host,m=l?.ownerDocument.contains(l)||e.ownerDocument.contains(e);if(!a||a==="full"){if(typeof n=="function"){for(var p=e;e;){var v=e.parentElement,h=B(e);if(v&&!v.shadowRoot&&n(v)===!0)return W(e);e.assignedSlot?e=e.assignedSlot:!v&&h!==e.ownerDocument?e=h.host:e=v}e=p}if(m)return!e.getClientRects().length}else if(a==="non-zero-area")return W(e);return!1},pe=function(e){if(/^(INPUT|BUTTON|SELECT|TEXTAREA)$/.test(e.tagName))for(var t=e.parentElement;t;){if(t.tagName==="FIELDSET"&&t.disabled){for(var a=0;a<t.children.length;a++){var n=t.children.item(a);if(n.tagName==="LEGEND")return N.call(t,"fieldset[disabled] *")?!0:!n.contains(e)}return!0}t=t.parentElement}return!1},I=function(e,t){return!(t.disabled||ce(t)||he(t,e)||le(t)||pe(t))},G=function(e,t){return!(ve(t)||Y(t)<0||!I(e,t))},ge=function(e){var t=parseInt(e.getAttribute("tabindex"),10);return!!(isNaN(t)||t>=0)},me=function i(e){var t=[],a=[];return e.forEach(function(n,r){var s=!!n.scope,l=s?n.scope:n,m=Y(l,s),p=s?i(n.candidates):l;m===0?s?t.push.apply(t,p):t.push(l):a.push({documentOrder:r,tabIndex:m,item:n,isScope:s,content:p})}),a.sort(se).reduce(function(n,r){return r.isScope?n.push.apply(n,r.content):n.push(r.content),n},[]).concat(t)},z=function(e,t){t=t||{};var a;return t.getShadowRoot?a=$([e],t.includeContainer,{filter:G.bind(null,t),flatten:!1,getShadowRoot:t.getShadowRoot,shadowRootFilter:ge}):a=V(e,t.includeContainer,G.bind(null,t)),me(a)},x=function(e,t){t=t||{};var a;return t.getShadowRoot?a=$([e],t.includeContainer,{filter:I.bind(null,t),flatten:!0,getShadowRoot:t.getShadowRoot}):a=V(e,t.includeContainer,I.bind(null,t)),a},A=function(e,t){if(t=t||{},!e)throw new Error("No node provided");return N.call(e,k)===!1?!1:G(t,e)},ye=_.concat("iframe").join(","),R=function(e,t){if(t=t||{},!e)throw new Error("No node provided");return N.call(e,ye)===!1?!1:I(t,e)};function Q(i,e){var t=Object.keys(i);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(i);e&&(a=a.filter(function(n){return Object.getOwnPropertyDescriptor(i,n).enumerable})),t.push.apply(t,a)}return t}function X(i){for(var e=1;e<arguments.length;e++){var t=arguments[e]!=null?arguments[e]:{};e%2?Q(Object(t),!0).forEach(function(a){we(i,a,t[a])}):Object.getOwnPropertyDescriptors?Object.defineProperties(i,Object.getOwnPropertyDescriptors(t)):Q(Object(t)).forEach(function(a){Object.defineProperty(i,a,Object.getOwnPropertyDescriptor(t,a))})}return i}function we(i,e,t){return e in i?Object.defineProperty(i,e,{value:t,enumerable:!0,configurable:!0,writable:!0}):i[e]=t,i}var J=function(){var i=[];return{activateTrap:function(t){if(i.length>0){var a=i[i.length-1];a!==t&&a.pause()}var n=i.indexOf(t);n===-1||i.splice(n,1),i.push(t)},deactivateTrap:function(t){var a=i.indexOf(t);a!==-1&&i.splice(a,1),i.length>0&&i[i.length-1].unpause()}}}(),Te=function(e){return e.tagName&&e.tagName.toLowerCase()==="input"&&typeof e.select=="function"},Fe=function(e){return e.key==="Escape"||e.key==="Esc"||e.keyCode===27},Se=function(e){return e.key==="Tab"||e.keyCode===9},ee=function(e){return setTimeout(e,0)},te=function(e,t){var a=-1;return e.every(function(n,r){return t(n)?(a=r,!1):!0}),a},O=function(e){for(var t=arguments.length,a=new Array(t>1?t-1:0),n=1;n<t;n++)a[n-1]=arguments[n];return typeof e=="function"?e.apply(void 0,a):e},L=function(e){return e.target.shadowRoot&&typeof e.composedPath=="function"?e.composedPath()[0]:e.target},re=function(e,t){var a=t?.document||document,n=X({returnFocusOnDeactivate:!0,escapeDeactivates:!0,delayInitialFocus:!0},t),r={containers:[],containerGroups:[],tabbableGroups:[],nodeFocusedBeforeActivation:null,mostRecentlyFocusedNode:null,active:!1,paused:!1,delayInitialFocusTimer:void 0},s,l=function(o,u,c){return o&&o[u]!==void 0?o[u]:n[c||u]},m=function(o){return r.containerGroups.findIndex(function(u){var c=u.container,b=u.tabbableNodes;return c.contains(o)||b.find(function(f){return f===o})})},p=function(o){var u=n[o];if(typeof u=="function"){for(var c=arguments.length,b=new Array(c>1?c-1:0),f=1;f<c;f++)b[f-1]=arguments[f];u=u.apply(void 0,b)}if(u===!0&&(u=void 0),!u){if(u===void 0||u===!1)return u;throw new Error("`".concat(o,"` was specified but was not a node, or did not return a node"))}var g=u;if(typeof u=="string"&&(g=a.querySelector(u),!g))throw new Error("`".concat(o,"` as selector refers to no known node"));return g},v=function(){var o=p("initialFocus");if(o===!1)return!1;if(o===void 0)if(m(a.activeElement)>=0)o=a.activeElement;else{var u=r.tabbableGroups[0],c=u&&u.firstTabbableNode;o=c||p("fallbackFocus")}if(!o)throw new Error("Your focus-trap needs to have at least one focusable element");return o},h=function(){if(r.containerGroups=r.containers.map(function(o){var u=z(o,n.tabbableOptions),c=x(o,n.tabbableOptions);return{container:o,tabbableNodes:u,focusableNodes:c,firstTabbableNode:u.length>0?u[0]:null,lastTabbableNode:u.length>0?u[u.length-1]:null,nextTabbableNode:function(f){var g=arguments.length>1&&arguments[1]!==void 0?arguments[1]:!0,F=c.findIndex(function(E){return E===f});if(!(F<0))return g?c.slice(F+1).find(function(E){return A(E,n.tabbableOptions)}):c.slice(0,F).reverse().find(function(E){return A(E,n.tabbableOptions)})}}}),r.tabbableGroups=r.containerGroups.filter(function(o){return o.tabbableNodes.length>0}),r.tabbableGroups.length<=0&&!p("fallbackFocus"))throw new Error("Your focus-trap must have at least one container with at least one tabbable node in it at all times")},y=function d(o){if(o!==!1&&o!==a.activeElement){if(!o||!o.focus){d(v());return}o.focus({preventScroll:!!n.preventScroll}),r.mostRecentlyFocusedNode=o,Te(o)&&o.select()}},w=function(o){var u=p("setReturnFocus",o);return u||(u===!1?!1:o)},S=function(o){var u=L(o);if(!(m(u)>=0)){if(O(n.clickOutsideDeactivates,o)){s.deactivate({returnFocus:n.returnFocusOnDeactivate&&!R(u,n.tabbableOptions)});return}O(n.allowOutsideClick,o)||o.preventDefault()}},D=function(o){var u=L(o),c=m(u)>=0;c||u instanceof Document?c&&(r.mostRecentlyFocusedNode=u):(o.stopImmediatePropagation(),y(r.mostRecentlyFocusedNode||v()))},T=function(o){var u=L(o);h();var c=null;if(r.tabbableGroups.length>0){var b=m(u),f=b>=0?r.containerGroups[b]:void 0;if(b<0)o.shiftKey?c=r.tabbableGroups[r.tabbableGroups.length-1].lastTabbableNode:c=r.tabbableGroups[0].firstTabbableNode;else if(o.shiftKey){var g=te(r.tabbableGroups,function(P){var j=P.firstTabbableNode;return u===j});if(g<0&&(f.container===u||R(u,n.tabbableOptions)&&!A(u,n.tabbableOptions)&&!f.nextTabbableNode(u,!1))&&(g=b),g>=0){var F=g===0?r.tabbableGroups.length-1:g-1,E=r.tabbableGroups[F];c=E.lastTabbableNode}}else{var C=te(r.tabbableGroups,function(P){var j=P.lastTabbableNode;return u===j});if(C<0&&(f.container===u||R(u,n.tabbableOptions)&&!A(u,n.tabbableOptions)&&!f.nextTabbableNode(u))&&(C=b),C>=0){var oe=C===r.tabbableGroups.length-1?0:C+1,ue=r.tabbableGroups[oe];c=ue.firstTabbableNode}}}else c=p("fallbackFocus");c&&(o.preventDefault(),y(c))},M=function(o){if(Fe(o)&&O(n.escapeDeactivates,o)!==!1){o.preventDefault(),s.deactivate();return}if(Se(o)){T(o);return}},q=function(o){var u=L(o);m(u)>=0||O(n.clickOutsideDeactivates,o)||O(n.allowOutsideClick,o)||(o.preventDefault(),o.stopImmediatePropagation())},H=function(){if(r.active)return J.activateTrap(s),r.delayInitialFocusTimer=n.delayInitialFocus?ee(function(){y(v())}):y(v()),a.addEventListener("focusin",D,!0),a.addEventListener("mousedown",S,{capture:!0,passive:!1}),a.addEventListener("touchstart",S,{capture:!0,passive:!1}),a.addEventListener("click",q,{capture:!0,passive:!1}),a.addEventListener("keydown",M,{capture:!0,passive:!1}),s},U=function(){if(r.active)return a.removeEventListener("focusin",D,!0),a.removeEventListener("mousedown",S,!0),a.removeEventListener("touchstart",S,!0),a.removeEventListener("click",q,!0),a.removeEventListener("keydown",M,!0),s};return s={get active(){return r.active},get paused(){return r.paused},activate:function(o){if(r.active)return this;var u=l(o,"onActivate"),c=l(o,"onPostActivate"),b=l(o,"checkCanFocusTrap");b||h(),r.active=!0,r.paused=!1,r.nodeFocusedBeforeActivation=a.activeElement,u&&u();var f=function(){b&&h(),H(),c&&c()};return b?(b(r.containers.concat()).then(f,f),this):(f(),this)},deactivate:function(o){if(!r.active)return this;var u=X({onDeactivate:n.onDeactivate,onPostDeactivate:n.onPostDeactivate,checkCanReturnFocus:n.checkCanReturnFocus},o);clearTimeout(r.delayInitialFocusTimer),r.delayInitialFocusTimer=void 0,U(),r.active=!1,r.paused=!1,J.deactivateTrap(s);var c=l(u,"onDeactivate"),b=l(u,"onPostDeactivate"),f=l(u,"checkCanReturnFocus"),g=l(u,"returnFocus","returnFocusOnDeactivate");c&&c();var F=function(){ee(function(){g&&y(w(r.nodeFocusedBeforeActivation)),b&&b()})};return g&&f?(f(w(r.nodeFocusedBeforeActivation)).then(F,F),this):(F(),this)},pause:function(){return r.paused||!r.active?this:(r.paused=!0,U(),this)},unpause:function(){return!r.paused||!r.active?this:(r.paused=!1,h(),H(),this)},updateContainerElements:function(o){var u=[].concat(o).filter(Boolean);return r.containers=u.map(function(c){return typeof c=="string"?a.querySelector(c):c}),r.active&&h(),this}},s.updateContainerElements(e),s};function ne(i){let e,t;window.addEventListener("focusin",()=>{e=t,t=document.activeElement}),i.magic("focus",a=>{let n=a;return{__noscroll:!1,__wrapAround:!1,within(r){return n=r,this},withoutScrolling(){return this.__noscroll=!0,this},noscroll(){return this.__noscroll=!0,this},withWrapAround(){return this.__wrapAround=!0,this},wrap(){return this.withWrapAround()},focusable(r){return R(r)},previouslyFocused(){return e},lastFocused(){return e},focused(){return t},focusables(){return Array.isArray(n)?n:x(n,{displayCheck:"none"})},all(){return this.focusables()},isFirst(r){let s=this.all();return s[0]&&s[0].isSameNode(r)},isLast(r){let s=this.all();return s.length&&s.slice(-1)[0].isSameNode(r)},getFirst(){return this.all()[0]},getLast(){return this.all().slice(-1)[0]},getNext(){let r=this.all(),s=document.activeElement;if(r.indexOf(s)!==-1)return this.__wrapAround&&r.indexOf(s)===r.length-1?r[0]:r[r.indexOf(s)+1]},getPrevious(){let r=this.all(),s=document.activeElement;if(r.indexOf(s)!==-1)return this.__wrapAround&&r.indexOf(s)===0?r.slice(-1)[0]:r[r.indexOf(s)-1]},first(){this.focus(this.getFirst())},last(){this.focus(this.getLast())},next(){this.focus(this.getNext())},previous(){this.focus(this.getPrevious())},prev(){return this.previous()},focus(r){r&&setTimeout(()=>{r.hasAttribute("tabindex")||r.setAttribute("tabindex","0"),r.focus({preventScroll:this.__noscroll})})}}}),i.directive("trap",i.skipDuringClone((a,{expression:n,modifiers:r},{effect:s,evaluateLater:l,cleanup:m})=>{let p=l(n),v=!1,h={escapeDeactivates:!1,allowOutsideClick:!0,fallbackFocus:()=>a};if(r.includes("noautofocus"))h.initialFocus=!1;else{let T=a.querySelector("[autofocus]");T&&(h.initialFocus=T)}let y=re(a,h),w=()=>{},S=()=>{},D=()=>{w(),w=()=>{},S(),S=()=>{},y.deactivate({returnFocus:!r.includes("noreturn")})};s(()=>p(T=>{v!==T&&(T&&!v&&(r.includes("noscroll")&&(S=Ee()),r.includes("inert")&&(w=ae(a)),setTimeout(()=>{y.activate()},15)),!T&&v&&D(),v=!!T)})),m(D)},(a,{expression:n,modifiers:r},{evaluate:s})=>{r.includes("inert")&&s(n)&&ae(a)}))}function ae(i){let e=[];return ie(i,t=>{let a=t.hasAttribute("aria-hidden");t.setAttribute("aria-hidden","true"),e.push(()=>a||t.removeAttribute("aria-hidden"))}),()=>{for(;e.length;)e.pop()()}}function ie(i,e){i.isSameNode(document.body)||!i.parentNode||Array.from(i.parentNode.children).forEach(t=>{t.isSameNode(i)?ie(i.parentNode,e):e(t)})}function Ee(){let i=document.documentElement.style.overflow,e=document.documentElement.style.paddingRight,t=window.innerWidth-document.documentElement.clientWidth;return document.documentElement.style.overflow="hidden",document.documentElement.style.paddingRight=`${t}px`,()=>{document.documentElement.style.overflow=i,document.documentElement.style.paddingRight=e}}document.addEventListener("alpine:init",()=>{window.Alpine.plugin(ne)});})();
/*! Bundled license information:

tabbable/dist/index.esm.js:
  (*!
  * tabbable 5.3.3
  * @license MIT, https://github.com/focus-trap/tabbable/blob/master/LICENSE
  *)

focus-trap/dist/focus-trap.esm.js:
  (*!
  * focus-trap 6.9.4
  * @license MIT, https://github.com/focus-trap/focus-trap/blob/master/LICENSE
  *)
*/

(()=>{function u(e){e.directive("resize",e.skipDuringClone((t,{value:i,expression:n,modifiers:o},{evaluateLater:r,cleanup:h})=>{let f=r(n),s=(z,m)=>{f(()=>{},{scope:{$width:z,$height:m}})},v=o.includes("document")?b(s):a(t,s);h(()=>v())}))}function a(e,t){let i=new ResizeObserver(n=>{let[o,r]=c(n);t(o,r)});return i.observe(e),()=>i.disconnect()}var d,l=new Set;function b(e){return l.add(e),d||(d=new ResizeObserver(t=>{let[i,n]=c(t);l.forEach(o=>o(i,n))}),d.observe(document.documentElement)),()=>{l.delete(e)}}function c(e){let t,i;for(let n of e)t=n.borderBoxSize[0].inlineSize,i=n.borderBoxSize[0].blockSize;return[t,i]}document.addEventListener("alpine:init",()=>{window.Alpine.plugin(u)});})();

window.addEventListener('DOMContentLoaded', () => {
    console.log('Loaded Scripts')

    const swiperGreed = new Swiper(".mySwiper3", {
        slidesPerView: 3,
        grid: {
            rows: 2,
        },
        spaceBetween: 32,
        pagination: {
            el: ".swiper-pagination",
            clickable: true,
        },
    });

    const swiper = new Swiper(".mySwiper", {
        spaceBetween: 16,
        slidesPerView: 3,
        watchSlidesProgress: true,
    });
    const swiper2 = new Swiper(".mySwiper2", {
        spaceBetween: 16,
        navigation: null,
        thumbs: {
            swiper: swiper,
        },
    });


})

const modal = document.getElementById('modal')
const openModalBtn = document.getElementById('openModal')
const closeModalElements = document.querySelectorAll('.close-modal')

if (modal && openModalBtn && closeModalElements) {
    const openModal = () => {
        modal.classList.remove('hidden')
    }

    const closeModal = () => {
        modal.classList.add('hidden')
    }

    openModalBtn.addEventListener('click', openModal)

    closeModalElements.forEach(el => {
        el.addEventListener('click', closeModal)
    })

    window.addEventListener('click', event => {
        if (event.target === modal) {
            closeModal()
        }
    })
}

// JavaScript to toggle the mega menu
const toggles = document.querySelectorAll('button[data-menu-target]')
let currentMenu = null
let currentButton = null

toggles.forEach(toggle => {
    toggle.addEventListener('click', function (event) {
        event.stopPropagation()
        const targetId = toggle.getAttribute('data-menu-target')
        const targetMenu = document.getElementById(targetId)

        if (currentMenu && currentMenu !== targetMenu) {
            currentMenu.classList.add('hidden')
            currentButton.classList.remove('active')
        }

        if (targetMenu.classList.contains('hidden')) {
            targetMenu.classList.remove('hidden')
            toggle.classList.add('active')
            currentMenu = targetMenu
            currentButton = toggle
        } else {
            targetMenu.classList.add('hidden')
            toggle.classList.remove('active')
            currentMenu = null
            currentButton = null
        }
    })
})

// Close the mega menu if clicking outside of it
document.addEventListener('click', function (event) {
    if (currentMenu && !currentMenu.contains(event.target)) {
        currentMenu.classList.add('hidden')
        if (currentButton) {
            currentButton.classList.remove('active')
        }
        currentMenu = null
        currentButton = null
    }
})

// Prevent menu closing when clicking inside the mega menu
document.querySelectorAll('.mega-menu').forEach(menu => {
    menu.addEventListener('click', function (event) {
        event.stopPropagation()
    })
})

document.addEventListener('DOMContentLoaded', function () {
    const burgerButton = document.getElementById('burger-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const closeMenuBtn = document.querySelector('.close-mob-menu');
    const menuOverlay = document.querySelector('.menu-overlay');

    const toggleMenu = () => {
        mobileMenu.classList.toggle('active');
        document.body.classList.toggle('overflow-hidden');
    };

    if (burgerButton && mobileMenu && closeMenuBtn && menuOverlay) {
        burgerButton.addEventListener('click', toggleMenu);
        closeMenuBtn.addEventListener('click', toggleMenu);
        menuOverlay.addEventListener('click', toggleMenu);
    }
})

// Закрываем подменю при клике вне меню
document.addEventListener('click', event => {
    const isClickInsideMenu = event.target.closest('nav')
    if (!isClickInsideMenu) {
        document.querySelectorAll('.submenu').forEach(submenu => {
            submenu.classList.add('hidden')
        })
    }
})

document.addEventListener('DOMContentLoaded', () => {
    const customSelect = document.querySelector('.custom-select')
    const selectBtn = document.querySelector('.select-button')
    const selectedValue = document.querySelector('.selected-value')
    const optionsList = document.querySelectorAll('.select-dropdown li')

    if (optionsList.length > 0) {
        selectedValue.textContent =
            optionsList[0].querySelector('label').textContent

        optionsList[0].querySelector('input').checked = true
    }

    if (selectBtn) {
        selectBtn.addEventListener('click', () => {
            customSelect.classList.toggle('active')

            selectBtn.setAttribute(
                'aria-expanded',
                selectBtn.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'
            )

            const dropdown = customSelect.querySelector('.select-dropdown')
            if (customSelect.classList.contains('active')) {
                dropdown.classList.remove('scale-y-0', 'opacity-0', 'invisible')
                dropdown.classList.add('scale-y-100', 'opacity-100', 'visible')
                selectBtn.querySelector('.arrow').classList.add('rotate-180')
            } else {
                dropdown.classList.remove('scale-y-100', 'opacity-100', 'visible')
                dropdown.classList.add('scale-y-0', 'opacity-0', 'invisible')
                selectBtn.querySelector('.arrow').classList.remove('rotate-180')
            }
        })
    }

    optionsList.forEach(option => {
        function handler(e) {
            if (e.type === 'click' && e.clientX !== 0 && e.clientY !== 0) {
                selectedValue.textContent = option.querySelector('label').textContent
                customSelect.classList.remove('active')

                const dropdown = customSelect.querySelector('.select-dropdown')
                dropdown.classList.remove('scale-y-100', 'opacity-100', 'visible')
                dropdown.classList.add('scale-y-0', 'opacity-0', 'invisible')
                selectBtn.querySelector('.arrow').classList.remove('rotate-180')
            }

            if (e.key === 'Enter') {
                selectedValue.textContent = option.querySelector('label').textContent
                customSelect.classList.remove('active')

                const dropdown = customSelect.querySelector('.select-dropdown')
                dropdown.classList.remove('scale-y-100', 'opacity-100', 'visible')
                dropdown.classList.add('scale-y-0', 'opacity-0', 'invisible')
                selectBtn.querySelector('.arrow').classList.remove('rotate-180')
            }
        }

        option.addEventListener('keyup', handler)
        option.addEventListener('click', handler)
    })

    document.addEventListener('click', event => {
        if (customSelect) {
            if (
                !customSelect.contains(event.target) &&
                customSelect.classList.contains('active')
            ) {
                customSelect.classList.remove('active')
                const dropdown = customSelect.querySelector('.select-dropdown')
                dropdown.classList.remove('scale-y-100', 'opacity-100', 'visible')
                dropdown.classList.add('scale-y-0', 'opacity-0', 'invisible')
                selectBtn.querySelector('.arrow').classList.remove('rotate-180')
                selectBtn.setAttribute('aria-expanded', 'false')
            }
        }
    })
})

/**
 * persian-digits.js
 * نمایش خودکار ارقام فارسی در متن و ورودی‌های عددی سایت.
 *
 * قواعد:
 * - متن‌های قابل مشاهده: 0-9 و ارقام عربی به فارسی تبدیل می‌شوند.
 * - فقط inputهایی که data-persian-input دارند هنگام تایپ فارسی می‌شوند.
 * - password دست‌نخورده می‌ماند.
 * - برای API/اعتبارسنجی از PersianDigits.value(...) استفاده کنید تا مقدار ASCII بگیرید.
 * - فرم‌های native هنگام submit به صورت خودکار با ارقام انگلیسی ارسال می‌شوند.
 * - برای غیرفعال کردن تبدیل در یک بخش: data-persian-digits="off"
 */

(function (global) {
    "use strict";

    const EN_DIGITS = "0123456789";
    const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
    const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

    const SKIP_TAGS = new Set([
        "SCRIPT",
        "STYLE",
        "NOSCRIPT",
        "TEXTAREA",
        "INPUT",
        "CODE",
        "PRE",
        "KBD",
        "SAMP"
    ]);

    function toPersian(value) {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/[0-9]/g, digit => {
                return FA_DIGITS[EN_DIGITS.indexOf(digit)];
            })
            .replace(/[٠-٩]/g, digit => {
                return FA_DIGITS[AR_DIGITS.indexOf(digit)];
            });
    }

    function toEnglish(value) {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/[۰-۹]/g, digit => {
                return EN_DIGITS[FA_DIGITS.indexOf(digit)];
            })
            .replace(/[٠-٩]/g, digit => {
                return EN_DIGITS[AR_DIGITS.indexOf(digit)];
            });
    }

    function value(inputOrValue) {
        if (
            inputOrValue &&
            typeof inputOrValue === "object" &&
            "value" in inputOrValue
        ) {
            return toEnglish(inputOrValue.value);
        }

        return toEnglish(inputOrValue);
    }

    function isDisabledForNode(node) {
        let element =
            node &&
            node.nodeType === Node.ELEMENT_NODE
                ? node
                : node && node.parentElement;

        while (element) {
            if (
                element.getAttribute &&
                element.getAttribute("data-persian-digits") === "off"
            ) {
                return true;
            }

            if (element.isContentEditable) {
                return true;
            }

            element = element.parentElement;
        }

        return false;
    }

    function shouldSkipTextNode(textNode) {
        const parent = textNode.parentElement;

        if (!parent) {
            return true;
        }

        if (SKIP_TAGS.has(parent.tagName)) {
            return true;
        }

        if (isDisabledForNode(textNode)) {
            return true;
        }

        return false;
    }

    function convertTextNode(textNode) {
        if (shouldSkipTextNode(textNode)) {
            return;
        }

        const oldValue = textNode.nodeValue;

        if (!oldValue || !/[0-9٠-٩]/.test(oldValue)) {
            return;
        }

        const newValue = toPersian(oldValue);

        if (newValue !== oldValue) {
            textNode.nodeValue = newValue;
        }
    }

    function convertAttributes(element) {
        if (!(element instanceof Element)) {
            return;
        }

        if (isDisabledForNode(element)) {
            return;
        }

        const visualAttributes = [
            "title",
            "aria-label",
            "aria-description",
            "placeholder"
        ];

        for (const attribute of visualAttributes) {
            if (!element.hasAttribute(attribute)) {
                continue;
            }

            const oldValue =
                element.getAttribute(attribute);

            if (
                !oldValue ||
                !/[0-9٠-٩]/.test(oldValue)
            ) {
                continue;
            }

            const newValue =
                toPersian(oldValue);

            if (newValue !== oldValue) {
                element.setAttribute(
                    attribute,
                    newValue
                );
            }
        }
    }

    function convertElement(root) {
        if (!root) {
            return;
        }

        if (root.nodeType === Node.TEXT_NODE) {
            convertTextNode(root);
            return;
        }

        if (
            !(root instanceof Element) &&
            root !== document &&
            root !== document.body
        ) {
            return;
        }

        if (root instanceof Element) {
            convertAttributes(root);

            if (
                SKIP_TAGS.has(root.tagName) ||
                isDisabledForNode(root)
            ) {
                return;
            }
        }

        const walker =
            document.createTreeWalker(
                root,
                NodeFilter.SHOW_TEXT |
                    NodeFilter.SHOW_ELEMENT,
                {
                    acceptNode(node) {
                        if (
                            node.nodeType ===
                            Node.ELEMENT_NODE
                        ) {
                            const element = node;

                            if (
                                isDisabledForNode(
                                    element
                                )
                            ) {
                                return NodeFilter.FILTER_REJECT;
                            }

                            if (
                                SKIP_TAGS.has(
                                    element.tagName
                                )
                            ) {
                                convertAttributes(
                                    element
                                );

                                return NodeFilter.FILTER_REJECT;
                            }

                            return NodeFilter.FILTER_ACCEPT;
                        }

                        if (
                            node.nodeType ===
                            Node.TEXT_NODE
                        ) {
                            return shouldSkipTextNode(
                                node
                            )
                                ? NodeFilter.FILTER_REJECT
                                : NodeFilter.FILTER_ACCEPT;
                        }

                        return NodeFilter.FILTER_SKIP;
                    }
                }
            );

        let node;

        while ((node = walker.nextNode())) {
            if (
                node.nodeType ===
                Node.TEXT_NODE
            ) {
                convertTextNode(node);
            } else if (
                node.nodeType ===
                Node.ELEMENT_NODE
            ) {
                convertAttributes(node);
            }
        }
    }

    const enhancedInputs =
        new WeakSet();

    function enhanceInput(input) {
        if (
            !(input instanceof HTMLInputElement)
        ) {
            return;
        }

        if (
            !input.hasAttribute(
                "data-persian-input"
            )
        ) {
            return;
        }

        if (
            input.type === "password" ||
            input.type === "file"
        ) {
            return;
        }

        if (enhancedInputs.has(input)) {
            return;
        }

        enhancedInputs.add(input);

        if (!input.dir) {
            input.dir = "rtl";
        }

        convertAttributes(input);

        const renderPersian = () => {
            const oldValue = input.value;

            if (
                !oldValue ||
                !/[0-9٠-٩]/.test(oldValue)
            ) {
                return;
            }

            let selectionStart = null;
            let selectionEnd = null;

            try {
                selectionStart =
                    input.selectionStart;

                selectionEnd =
                    input.selectionEnd;
            } catch (_) {
                // بعضی inputها selection ندارند
            }

            const newValue =
                toPersian(oldValue);

            if (newValue !== oldValue) {
                input.value = newValue;
            }

            if (
                selectionStart !== null &&
                selectionEnd !== null
            ) {
                try {
                    input.setSelectionRange(
                        selectionStart,
                        selectionEnd
                    );
                } catch (_) {
                    // نادیده گرفتن خطا
                }
            }
        };

        input.addEventListener(
            "input",
            renderPersian
        );

        input.addEventListener(
            "change",
            renderPersian
        );

        input.addEventListener(
            "focus",
            renderPersian
        );

        renderPersian();
    }

    function enhanceInputs(root) {
        const scope =
            root && root.querySelectorAll
                ? root
                : document;

        if (
            root instanceof HTMLInputElement
        ) {
            enhanceInput(root);
        }

        scope
            .querySelectorAll(
                "input[data-persian-input]"
            )
            .forEach(enhanceInput);
    }

    function normalizeForm(form) {
        if (
            !(form instanceof HTMLFormElement)
        ) {
            return;
        }

        form
            .querySelectorAll(
                "input[data-persian-input]"
            )
            .forEach(input => {
                input.value =
                    toEnglish(input.value);
            });
    }

    document.addEventListener(
        "submit",
        event => {
            const form = event.target;
            normalizeForm(form);

            // If another handler prevents navigation (for example client-side
            // validation), restore the Persian visual representation on the
            // next task. Native form submission has already captured the ASCII
            // value before a later task can run.
            window.setTimeout(() => {
                if (!(form instanceof HTMLFormElement) || !document.contains(form)) {
                    return;
                }
                form.querySelectorAll("input[data-persian-input]").forEach(input => {
                    if (input.type !== "password" && input.type !== "file") {
                        input.value = toPersian(input.value);
                    }
                });
            }, 0);
        },
        true
    );

    let observer = null;

    function startObserver() {
        if (
            observer ||
            !document.body
        ) {
            return;
        }

        observer =
            new MutationObserver(
                mutations => {
                    for (
                        const mutation
                        of mutations
                    ) {
                        if (
                            mutation.type ===
                            "characterData"
                        ) {
                            convertTextNode(
                                mutation.target
                            );

                            continue;
                        }

                        if (
                            mutation.type ===
                            "childList"
                        ) {
                            mutation.addedNodes
                                .forEach(node => {
                                    if (
                                        node.nodeType ===
                                            Node.TEXT_NODE ||
                                        node.nodeType ===
                                            Node.ELEMENT_NODE
                                    ) {
                                        convertElement(
                                            node
                                        );

                                        if (
                                            node.nodeType ===
                                            Node.ELEMENT_NODE
                                        ) {
                                            enhanceInputs(
                                                node
                                            );
                                        }
                                    }
                                });
                        }
                    }
                }
            );

        observer.observe(
            document.body,
            {
                childList: true,
                subtree: true,
                characterData: true
            }
        );
    }

    function stopObserver() {
        if (!observer) {
            return;
        }

        observer.disconnect();
        observer = null;
    }

    function init() {
        if (!document.body) {
            return;
        }

        convertElement(
            document.body
        );

        enhanceInputs(
            document
        );

        startObserver();
    }

    global.PersianDigits =
        Object.freeze({
            toPersian,
            toEnglish,
            value,
            convert: convertElement,
            enhanceInputs,
            normalizeForm,
            init,
            stop: stopObserver
        });

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            init,
            {
                once: true
            }
        );
    } else {
        init();
    }

})(window);
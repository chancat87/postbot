/**
 * Copyright (c) 2025-2099 GitCoffee All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
export const weixinChannelsVideoPublisher = async (data) => {
    console.log('weixinChannelsVideoPublisher data', data);

    // const { contentData, processedData } = data;

    const contentData = data?.data;
    const processedData = data?.data;

    let editorDocument = null;

    const sleep = async (time) => {
        console.log('sleep', time);
        return new Promise((resolve) => setTimeout(resolve, time));
    }
    
    const pasteEvent = (): ClipboardEvent => {
        console.log('pasteEvent');
        return new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer(),
        });
    }
    
    const observeElement = (selector, timeout = 10000) => {
        console.log('observeElement', selector);
        return new Promise((resolve, reject) => {
        //   const checkElement = () => document.querySelector(selector);

          let checkElement  = null;
          if (selector instanceof Function) {
            checkElement = selector;
          } else {
            console.log('editorDocument', editorDocument);
            console.log('document', document);
            checkElement = () => (editorDocument || document).querySelector(selector);
          }
      
          // 立即检查元素
          let element = checkElement();
          console.log('element', element);
          if (element) {
            resolve(element);
            return;
          }
      
          // 创建 MutationObserver 进行监听
          const observer = new MutationObserver(() => {
            element = checkElement();
            console.log('element', element);
            if (element) {
              resolve(element);
              observer.disconnect();
            }
          });
      
          // 启动观察
          console.log('editorDocument', editorDocument);
          console.log('document', document);
          observer.observe((editorDocument || document).body, {
            childList: true,
            subtree: true,
          });
      
          // 如果超时，拒绝 Promise，并返回中文错误提示
          setTimeout(() => {
            observer.disconnect();
            reject(new Error(`未能在 ${timeout} 毫秒内找到选择器为 "${selector}" 的元素`));
          }, timeout);
        });
      };
    
    const formElement = {
        wujieApp: 'wujie-app',
        editorIframe: 'iframe[name="content"]',
        title: 'div.post-short-title-wrap input',
        editor: 'div.input-editor',
        videoUpload: 'input[type="file"]',
        coverDelete: '.article-cover-delete',
        imageUploadAdd: 'div.article-cover-add',
        imageUploadTabs: 'div.byte-tabs-header-title',
        imageUploadTabText: '上传图片',
        imageUpload: 'input[type="file"]',
        videoContent: 'div.video-content',
        verticalCoverAdd: 'div.vertical-img-wrap',
        horizonCoverAdd: 'div.horizon-img-wrap',
        coverEditButton: 'div.btn-directly-edit button',
        coverUpload: 'div.edit-cover-dialog-container input[type="file"]',
        confirmUploadButton: 'div.edit-cover-dialog-container div.cover-set-footer button.weui-desktop-btn.weui-desktop-btn_primary',
        publishButtons: 'div.form-btns button.weui-desktop-btn',
        publishButtonText: '保存草稿',
        confirmButtonText: '发表',
    }
    
    const fromRule = {
        title: {
            min: 6,
            max: 16,
        }
    }

    const getEditorIframe = () => {
        return document.querySelector(formElement.editorIframe);
    }

    const getEditorDocument = () => {

        const wujieApp = document.querySelector(formElement.wujieApp);

        // const editorIframe = getEditorIframe();
        // return editorIframe.contentWindow.document;
        return wujieApp?.shadowRoot;
    }
    
    const autoFillContent = (contentData) => {
        console.log('autoFillContent');
        const titleTextarea = editorDocument.querySelector(formElement.title);
        console.log('titleTextarea', titleTextarea);
        if (titleTextarea) {
            (titleTextarea as HTMLTextAreaElement).value = contentData?.title?.slice(0, fromRule.title.max) || '';
            titleTextarea.dispatchEvent(new Event('input', { bubbles: true }));
            titleTextarea.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const editor = editorDocument.querySelector(formElement.editor)  as HTMLElement;
        console.log('editor', editor);
        if (!editor) {
            console.log('未找到编辑器');
            return;
        }

        const content = contentData?.description || contentData?.content;

        editor.focus();
        const editorPasteEvent = pasteEvent();
        editorPasteEvent.clipboardData.setData('text/plain', content);
        editor.dispatchEvent(editorPasteEvent);

        // (editor as HTMLTextAreaElement).value = content;

        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const base64ToBinary = (base64) => {
        const binaryString = atob(base64);  // 解码Base64
        const byteArray = new Uint8Array(binaryString.length);

        for (let i = 0; i < binaryString.length; i++) {
            byteArray[i] = binaryString.charCodeAt(i);
        }

        return byteArray;
    }

    const fetchImage = async (imageUrl) => {
        return new Promise((resolve, reject) => {
            // 发送消息到背景脚本，要求获取图片内容
            chrome.runtime.sendMessage({
                type: 'request',
                action: 'fetchImage',
                data: {
                    imageUrl: imageUrl
                }
            }, (response) => {
                console.log('response', response);
                const base64data = response.base64data;
                if (base64data) {
                    const dataPairs = base64data.split(',');
                    const fileType = dataPairs[0].replace('data:', '').split(';')[0];
                    const base64 = dataPairs[1];
                    const imageData = {
                        type: fileType || 'image/jpg',
                        bits: base64ToBinary(base64),
                        overwrite: true,
                        src: imageUrl,
                        fileName: response.imageName
                    }
                    console.log('imageData', imageData);
                    console.log('获取图片成功');
                    resolve(imageData);
                } else {
                    console.log('获取图片失败');
                    reject('获取图片失败');
                }
            });
        });
    }

    const getFileName = (fileName, url) => {
        let newFileName = fileName;
        console.log('fileName', fileName);
        if (!fileName) {
            const name = url.substring(url.lastIndexOf('/') + 1);
            if (name.indexOf('.') !== -1) {
                newFileName = name;
            }
        }

        if (!fileName) {
            newFileName = `${Date.now()}.jpg`;
        }
        console.log('newFileName', newFileName);
        return newFileName;
    }

    const uploadImages = async (images) => {
        console.log('images', images);
        // const imageUpload = await observeElement(formElement.imageUpload);
        // if (!imageUpload) {
        //     throw new Error('未找到图片上传元素');
        // }

        const imageUpload = editorDocument.querySelector(formElement.coverUpload) as HTMLElement;
        if (!imageUpload) {
            throw new Error('未找到图片上传元素');
        }

        console.log('imageUpload', imageUpload);

        const dataTransfer = new DataTransfer();

        for (const image of images) {
            if (image.objectUrl) {
                const response = await fetch(image.objectUrl);
                const blob = await response.blob();
    
                const file = new File([blob], image.name, { type: image.type });
                dataTransfer.items.add(file);
            } else {
                const url = image?.url || image?.src;
                const imageData = await fetchImage(url);
    
                let fileName = imageData.fileName;
                if (!fileName) {
                    fileName = getFileName(fileName, url);
                }
    
                const blob = new Blob([imageData.bits], { type: imageData.type });
                const file = new File([blob], fileName, { type: imageData.type });
                dataTransfer.items.add(file);
            }
        }

        if (dataTransfer.files.length === 0) {
            console.error('上传文件失败');
            return;
        }

        imageUpload.files = dataTransfer.files;
        imageUpload.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(2000);
        console.log('图片上传成功');
    }
    
    const autoFillCover = async(cover, coverElement) => {
        // const clearDefaultCovers = async() => {
        //     const coverDeleteElements = editorDocument.querySelectorAll(formElement.coverDelete);
        //     if (!coverDeleteElements) {
        //         return;
        //     }
        //     console.log('coverDeleteElements length', coverDeleteElements.length);
        //     for (const coverDeleteElement of coverDeleteElements) {
        //         if (!coverDeleteElement) {
        //             continue;
        //         }
        //         console.log('coverDelete trrigle click');
        //         (coverDeleteElement as HTMLElement).click();
        //     }
        //     await sleep(1000);
        // };

        // await clearDefaultCovers();

        // const imageUploadAdd = editorDocument.querySelector(formElement.imageUploadAdd) as HTMLElement;
        const imageUploadAdd = (await observeElement(coverElement || formElement.imageUploadAdd)) as HTMLElement;
        if (!imageUploadAdd) {
            return;
        }

        imageUploadAdd.click();
        await sleep(2000);

        const coverEditButton = editorDocument.querySelector(formElement.coverEditButton) as HTMLElement;
        if (coverEditButton) {
            coverEditButton.click();
            await sleep(2000);
        }

        // const imageUploadTabs = editorDocument.querySelectorAll(formElement.imageUploadTabs);
        // const imageUploadTab = Array.from(imageUploadTabs).find(tab => tab.textContent?.includes(formElement.imageUploadTabText));
        // if (!imageUploadTab) {
        //     return;
        // }
        // (imageUploadTab as HTMLElement).click();
        // await sleep(1000);

        const covers = [];

        console.log('cover', cover);
        for (const image of cover) {
            if (image instanceof Object) {
                covers.push(image);
            } else {
                covers.push({
                    url: image,
                });
            }
        }

        console.log('covers', covers);
        await uploadImages(covers);
        await sleep(2000);

        // const confirmUploadButton = editorDocument.querySelector(formElement.confirmUploadButton);
        const confirmUploadButton = (await observeElement(formElement.confirmUploadButton)) as HTMLElement;
        if (!confirmUploadButton) {
            return;
        }

        confirmUploadButton.dispatchEvent(new Event('click', { bubbles: true }));
        await sleep(2000);
    };

    const autoUploadVideo = async(videoData) => {
        console.log('videoData', videoData);

        const videoUpload = (await observeElement(formElement.videoUpload)) as HTMLElement;
        if (!videoUpload) {
            throw new Error('未找到视频上传元素');
        }

        console.log('videoUpload', videoUpload);

        // const blob = new Blob([videoData.videoBuffer], { type: videoData.type });

        const response = await fetch(videoData.objectUrl);
        const blob = await response.blob();

        const file = new File([blob], videoData.name, { type: videoData.type });

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        videoUpload.files = dataTransfer.files;
        videoUpload.dispatchEvent(new Event('input', { bubbles: true }));
        videoUpload.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(2000);
        console.log('视频上传事件已发送');
    }
    
    const getPublishButton = () => {
        const buttons = editorDocument.querySelectorAll(formElement.publishButtons);
        const publishButton = Array.from(buttons)?.find((button) => button.textContent?.includes(formElement.publishButtonText));
        console.log('publishButton', publishButton);
        return publishButton;
    }

    const getConfirmPublishButton = () => {
        const buttons = editorDocument.querySelectorAll(formElement.publishButtons);
        const confirmPublishButton = Array.from(buttons)?.find((button) => button.textContent?.includes(formElement.confirmButtonText));
        console.log('confirmPublishButton', confirmPublishButton);
        return confirmPublishButton;
    }
    
    // 通过 CDP 派发真实鼠标事件点击（滚动至可见 → 悬浮 → 按下 → 抬起），失败时回退 DOM click
    const cdpClick = async (element: HTMLElement) => {
        element.scrollIntoView({ block: 'center', inline: 'center' });
        await sleep(300);

        const rect = element.getBoundingClientRect();
        const x = Math.round(rect.left + rect.width / 2);
        const y = Math.round(rect.top + rect.height / 2);
        console.log('cdpClick', { x, y });

        if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
            console.log('cdpClick 不可用（无 chrome.runtime），回退 DOM click');
            element.click();
            return false;
        }

        return new Promise<boolean>((resolve) => {
            chrome.runtime.sendMessage({
                type: 'request',
                action: 'cdpClick',
                data: { x, y },
            }, (response: any) => {
                if (chrome.runtime.lastError || response?.error) {
                    console.log('cdpClick 失败，回退 DOM click', chrome.runtime.lastError?.message || response?.error);
                    element.click();
                    resolve(false);
                    return;
                }
                console.log('cdpClick 完成');
                resolve(true);
            });
        });
    }

    // 内容涉及时事/旧闻时，平台会弹出「发布内容自主声明」弹窗，需确认后才会真正发表
    const handleDeclareDialog = async () => {
        for (let i = 0; i < 10; i++) {
            await sleep(500);
            const dialogs = (editorDocument || document).querySelectorAll('.omui-dialog');
            const dialog = Array.from(dialogs as NodeListOf<HTMLElement>).find((item) =>
                item.textContent?.includes('发布内容自主声明')
            );
            if (!dialog) {
                continue;
            }
            console.log('发现「发布内容自主声明」弹窗', dialog);

            // 「无需标注」平台默认选中，未选中时兜底再点一次
            const noDeclareRadio = dialog.querySelector('input.omui-radio__input[value="0"]') as HTMLInputElement;
            if (noDeclareRadio && !noDeclareRadio.checked) {
                noDeclareRadio.click();
                await sleep(500);
            }

            // 点击弹窗底部确认按钮（通常为「确定/确认/发表」，位于「取消」之后）
            const confirmButton = Array.from(dialog.querySelectorAll('button') as NodeListOf<HTMLElement>)
                .reverse()
                .find((button) => ['确定', '确认', '发表'].some((text) => button.textContent?.includes(text)));
            if (confirmButton) {
                await cdpClick(confirmButton);
                console.log('已确认「发布内容自主声明」弹窗');
            }
            return;
        }
        console.log('未出现「发布内容自主声明」弹窗');
    }

    const autoPublish = async() => {
        console.log('autoPublish');
        // 「发表」与「保存草稿」同在 form-btns 且始终存在，不能先点「保存草稿」再点「发表」：
        // 定时发表场景下两者冲突（“使用定时发表将无法保存草稿”），且两次点击间隔过短会与
        // 草稿保存产生竞态，导致平台校验失败（LogicError: 发表失败），需直接点击「发表」
        const confirmPublishButton = getConfirmPublishButton();
        if (!confirmPublishButton) {
            console.log(`未找到${formElement.confirmButtonText}按钮`)
            return;
        }
        await sleep(1000);
        console.log('trrigle publish button click');
        await cdpClick(confirmPublishButton as HTMLElement);
        
        await handleDeclareDialog();
    }

    await sleep(5000);

    // await observeElement(formElement.editorIframe);
    await observeElement(formElement.wujieApp);
    await sleep(5000);

    editorDocument = getEditorDocument();

    await observeElement(formElement.videoUpload);
    await sleep(1000);

    await autoUploadVideo(processedData.videoData);
    await sleep(1000);

    await observeElement(formElement.editor);
    await sleep(1000);

    autoFillContent(processedData);
    await sleep(2000);

    // if (processedData?.cover) {
    //     // autoFillCover(processedData.cover);
    // }

    if (processedData?.horizontalCover) {
        await sleep(10000);
        await observeElement(formElement.videoContent, 300000);
        await autoFillCover(processedData.horizontalCover, formElement.horizonCoverAdd);
        await sleep(2000);
    }

    if (processedData?.verticalCover) {
        await sleep(2000);
        await observeElement(formElement.videoContent, 300000);
        await autoFillCover(processedData.verticalCover, formElement.verticalCoverAdd);
        await sleep(2000);
    }

    if (contentData.isAutoPublish) {
        await sleep(5000);
        autoPublish();
    }

}


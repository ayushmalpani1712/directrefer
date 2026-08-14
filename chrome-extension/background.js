chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ dr_hidden: false })
})

chrome.action.onClicked.addListener((tab) => { // eslint-disable-line @typescript-eslint/no-unused-vars
  chrome.tabs.create({ url: 'https://www.directrefer.in' })
})

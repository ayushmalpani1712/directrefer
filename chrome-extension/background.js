chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ dr_hidden: false })
})

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: 'https://www.directrefer.in' })
})

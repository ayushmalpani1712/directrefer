document.addEventListener('DOMContentLoaded', () => {
  chrome.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs?.[0]?.url) return
    const url = tabs[0].url

    const linkedinBadge = document.getElementById('badge-linkedin')
    const naukriBadge = document.getElementById('badge-naukri')

    if (url.includes('linkedin.com')) {
      linkedinBadge.classList.add('active')
      naukriBadge.classList.remove('active')
    } else if (url.includes('naukri.com')) {
      naukriBadge.classList.add('active')
      linkedinBadge.classList.remove('active')
    }
  })
})

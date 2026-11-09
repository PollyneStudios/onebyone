// Single source: the latest stable GitHub Release. No credentials in the website.
(async function loadRelease(){
  const buttons=[...document.querySelectorAll('[data-download]')];
  const notes={mac:document.querySelector('#download-mac .release'),windows:document.querySelector('#download-windows .release')};
  buttons.forEach(button=>button.addEventListener('click',event=>{if(button.getAttribute('aria-disabled')==='true')event.preventDefault();}));
  try{
    const response=await fetch('https://api.github.com/repos/PollyneStudios/onebyone/releases/latest',{headers:{Accept:'application/vnd.github+json'}});
    if(!response.ok)throw Error(`Release unavailable (${response.status})`);
    const release=await response.json();
    const selectors={mac:/macos-arm64\.dmg$/i,windows:/windows-x64\.exe$/i};
    for(const [platform,pattern] of Object.entries(selectors)){
      const asset=release.assets.find(asset=>pattern.test(asset.name)&&asset.state==='uploaded');
      if(!asset){notes[platform].textContent='Installer coming soon';continue;}
      const url=new URL(asset.browser_download_url);
      if(url.origin!=='https://github.com'||!url.pathname.startsWith('/PollyneStudios/onebyone/releases/download/'))throw Error('Unexpected download URL');
      const size=new Intl.NumberFormat('en',{maximumFractionDigits:1}).format(asset.size/1000000);
      notes[platform].textContent=`${release.tag_name} • ${platform==='mac'?'ARM64 .dmg':'Installer .exe'} (${size} MB)`;
      buttons.filter(button=>button.dataset.download===platform).forEach(button=>{button.href=url.href;button.removeAttribute('aria-disabled');button.setAttribute('download','');});
    }
  }catch(error){Object.values(notes).forEach(note=>note.textContent='Release not yet available');console.info('Download metadata:',error.message);}
})();

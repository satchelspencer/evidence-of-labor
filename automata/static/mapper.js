
function LU(r,o){o=o||!1;var f,n,e,t,u,L,U,a,l,v=Math.abs,s=r.length,c=s-1,h=new Array(s);for(o||(r=r),e=0;s>e;++e){for(U=e,L=r[e],l=v(L[e]),n=e+1;s>n;++n)t=v(r[n][e]),t>l&&(l=t,U=n);for(h[e]=U,U!=e&&(r[e]=r[U],r[U]=L,L=r[e]),u=L[e],f=e+1;s>f;++f)r[f][e]/=u;for(f=e+1;s>f;++f){for(a=r[f],n=e+1;c>n;++n)a[n]-=a[e]*L[n],++n,a[n]-=a[e]*L[n];n===c&&(a[n]-=a[e]*L[n])}}return{LU:r,P:h}}function LUsolve(r,o){var f,n,e,t,u,L=r.LU,U=L.length,a=o,l=r.P;for(f=U-1;-1!==f;--f)a[f]=o[f];for(f=0;U>f;++f)for(e=l[f],l[f]!==f&&(u=a[f],a[f]=a[e],a[e]=u),t=L[f],n=0;f>n;++n)a[f]-=a[n]*t[n];for(f=U-1;f>=0;--f){for(t=L[f],n=f+1;U>n;++n)a[f]-=a[n]*t[n];a[f]/=t[f]}return a}function solve(r,o,f){return LUsolve(LU(r,f),o)}
function dup(obj){return JSON.parse(JSON.stringify(obj))};

function projMap(element, coords, or){
  coords = dup(coords);
  or = dup(or);
  var A = coords.map(function(out, i){
    var xi = i%2==0?or[i]:or[i-1];
    var yi = i%2==0?or[i+1]:or[i];
    return (i%2==0?[xi,yi,1,0,0,0]:[0,0,0,xi,yi,1]).concat(-xi*coords[i],-yi*coords[i]);
  });
  var x = solve(A, coords);
  var t = [x[0],x[3],0,x[6],x[1],x[4],0,x[7],0,0,1,0,x[2],x[5],0,1];
  element.style.transform = 'matrix3d('+t.join(',')+')';
}


function projMapGui(element){
  var prev = window.localStorage['pmap']?JSON.parse(window.localStorage['pmap']):false;
  const {width, height, top, left} = element.getClientRects()[0]
  var origin = [left, top, width+left, top, left, height+top, width+left, height+top];
  //tl tr bl br
  if(prev){
    projMap(element, prev.coords, prev.origin)
    origin = prev.origin;	
  }
  var coo = prev? prev.coords : dup(origin);
  var v = ['top', 'bottom'];
  var h = ['left', 'right'];
  var index = 0;
  const corners = []
  for(var i in v) for(var j in h){
    var css = {
      position : 'absolute',
      width : '50%',
      height : '50%',
      pointerEvents:'none'
    };
    css[v[i]] = 0;
    css[h[j]] = 0;

    const handle = getHandle(index++)
    corners.push(handle)
    element.appendChild(handle)
  }
  function getHandle(index){
    const div = document.createElement('div')
    for(prop in css){
      div.style[prop] = css[prop]
    }
    return div
  }
  console.log(`
Keyboard Commands:
ctrl-M: start mapping
  `)

  let mapping = false,
    mindex = 0

  function setMindex(index){
    mindex = index
    corners.forEach((corner, i) => {
      if(i === index) corner.style.border = '1px dashed cyan'
      else corner.style.border = 'none'
    })
  }

  function updateProj(){
    projMap(element, coo, origin);
  }

  let reps = 0  
  window.addEventListener('keydown', e => {
    reps++
    const {key, ctrlKey} = e
    if(key === 'm' && ctrlKey){
      console.log('start mapping')
      mapping = true
      setMindex(0)

    }else if(mapping){
      e.preventDefault()
      e.stopImmediatePropagation()
      e.stopPropagation()

      const scale = Math.ceil(Math.sqrt(reps))

      if(key === 'Enter'){
        console.log('mapping done')
        window.localStorage['pmap'] = JSON.stringify({
          coords : coo,
          origin : origin
        });
        mapping = false
        setMindex(-1)
      }else if(key === 'r'){
        console.log('reset mapping')
        coo = [...origin]
        updateProj()
      }else if(key === '1'){
        console.log('top left')
        setMindex(0)
      }else if(key === '2'){
        console.log('top right')
        setMindex(1)
      }else if(key === '3'){
        console.log('bottom left')
        setMindex(2)
      }else if(key === '4'){
        console.log('bottom right')
        setMindex(3)
      }else if(key === 'ArrowUp'){
        coo[mindex*2+1] -= scale
        updateProj()
      }else if(key === 'ArrowLeft'){
        coo[mindex*2] -= scale
        updateProj()
      }else if(key === 'ArrowDown'){
        coo[mindex*2+1] += scale
        updateProj()
      }else if(key === 'ArrowRight'){
        coo[mindex*2] += scale
        updateProj()
      }
     
    }
  })

  window.addEventListener('keyup', () => {
    reps = 0
  })
}

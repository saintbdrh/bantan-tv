import { PARTNERS } from '@/lib/partners';

export function PartnerLogos() {
  const demo = !PARTNERS.length;
  const entries = demo ? Array.from({length:6},(_,i)=>({name:`Лого ${String(i+1).padStart(2,'0')}`,logo:'',url:undefined})) : PARTNERS;
  return <section className="partner-logos" aria-label="Хамтран ажиллагч байгууллагууд"><div className="partner-logos-heading"><h2>Хамтран ажиллагч байгууллагууд</h2>{demo && <span>Логоны жишиг байрлал</span>}</div><div className="partner-marquee"><div className="partner-logo-track">{[0,1].map(copy=><div key={copy} className="partner-logo-set" aria-hidden={copy===1?true:undefined}>{entries.map(entry=><div key={entry.name} className={`partner-logo ${demo?'placeholder-logo':''}`}>{entry.logo ? entry.url?<a href={entry.url} tabIndex={copy===1?-1:undefined} target="_blank" rel="noopener noreferrer"><img src={entry.logo} alt={entry.name} width={150} height={60}/></a>:<img src={entry.logo} alt={entry.name} width={150} height={60}/>:<><span aria-hidden="true">✦</span><span>{entry.name}</span></>}</div>)}</div>)}</div></div></section>;
}

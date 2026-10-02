import { SiteShell } from '@/components/SiteShell';
import { HomeBack } from '@/components/HomeBack';
import { PartnerBanner } from '@/components/PartnerBanner';

export default function AboutPage() {
  return (
    <SiteShell>
      <div className="container about-page">
        <HomeBack />

        <div className="about-hero">
          <p className="eyebrow">БИДНИЙ ТУХАЙ</p>
          <h1 className="about-slogan">Киногоо халуун дээр нь</h1>
          <p className="about-slogan-brand">Бантан тв</p>
        </div>

        <p className="page-lead about-lead">
          Bantan TV бол кино, түүх, мэдрэмжийг үзэгчдийн дэлгэцэнд халуун дээр нь хүргэдэг
          телевизийн суваг юм. Бид өглөөнөөс орой хүртэл шилдэг контентыг сонгож,
          Монголын гэр бүлд ойрхон, тод туршлагаар толилуулна.
        </p>

        <div className="about-grid">
          <div className="about-card dark-panel">
            <h2>Бидний зорилго</h2>
            <p>
              Үзэгч бүрт чанартай кино, сонирхолтой хөтөлбөр, найдвартай нэвтрүүлгийн хуваарь
              өгөх. Телевиз бол зөвхөн цаг алгах хэрэгсэл биш — хамтдаа үзэх, мэдрэх орон зай.
            </p>
          </div>
          <div className="about-card dark-panel">
            <h2>Юу санал болгодог вэ</h2>
            <ul>
              <li>Өдөр тутмын кино нэвтрүүлэг</li>
              <li>7 хоногийн тогтмол хөтөлбөр</li>
              <li>Гэр бүлийн болон насанд хүрэгчдийн контент</li>
              <li>Шууд эфир, онцлох цагийн нэвтрүүлэг</li>
            </ul>
          </div>
          <div className="about-card dark-panel">
            <h2>Холбоо барих</h2>
            <p>
              <a href="tel:+97677046868">7704-6868</a>
              <br />
              <a href="mailto:binge@bantan.tv">binge@bantan.tv</a>
            </p>
            <p className="about-muted">Facebook · Instagram — bantantv.mn</p>
          </div>
        </div>

        <div style={{ marginTop: 40 }}>
          <PartnerBanner />
        </div>
      </div>
    </SiteShell>
  );
}

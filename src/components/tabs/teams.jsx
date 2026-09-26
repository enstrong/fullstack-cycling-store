import ResponsiveImage from "@/components/responsive-image.jsx";
import UAE from '/team-logos/UAE_team_logo.png'
import Visma from '/team-logos/Team_Visma_logo.png'
import Sky from '/team-logos/Team_Sky_logo.jpg'
import Astana from '/team-logos/Astana_Team_Logo.jpg'

export default function Teams() {
  function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <>
      <div data-header-accent="yellow" className="section teams-section d-flex align-center">
        <div className="container d-flex align-center justify-space-between teams-section__group-logos">
          <div onClick={() => scrollToElement('uae')}>
            <ResponsiveImage sizes="190px" loading="eager" src={UAE} alt="uae team logo" className="teams-section__logo teams-section__logo-uae"/>
          </div>
          <div onClick={() => scrollToElement('visma')}>
            <ResponsiveImage sizes="190px" loading="eager" src={Visma} alt="team visma logo" className="teams-section__logo teams-section__logo-visma"/>
          </div>
          <div onClick={() => scrollToElement('sky')}>
            <ResponsiveImage sizes="190px" loading="eager" src={Sky} alt="team sky logo" className="teams-section__logo teams-section__logo-sky"/>
          </div>
          <div onClick={() => scrollToElement('astana')}>
            <ResponsiveImage sizes="190px" loading="eager" src={Astana} alt="astana team logo" className="teams-section__logo teams-section__logo-astana"/>
          </div>
        </div>
      </div>

      <div data-header-accent="yellow" id='uae' className="section uaeteam d-flex align-center">
        <div className="container d-flex align-center justify-center f-column">
          <h1 data-entrance className="uaeteam-title uppercase">UAE Team Emirates</h1>
          <section data-entrance className="team-info">
            <p className="uaeteam-text">Led by Tadej Pogačar, UAE Team Emirates has dominated the Tour de France in recent years.</p>
            <div className="team-achievements">
              <h3>Key Achievements:</h3>
              <ul>
                <li>Tour de France: 3x Winner (2020-21, 2024 - Tadej Pogačar)</li>
                <li>UCI Road World Championships Road Race: 2x Winner (2020, 2024 - Tadej Pogačar)</li>
                <li>Liège–Bastogne–Liège: 2x Winner (2020-21 - Tadej Pogačar)</li>
                <li>Milan-San Remo: 1x Winner (2020 - Tadej Pogačar)</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
  
      <div data-header-accent="yellow" id='visma' className="section teamvisma section d-flex align-center">
        <div className="container d-flex align-center justify-center f-column">
          <h1 data-entrance className="teamvisma-title">Team Visma | Lease a Bike</h1>
          <section data-entrance className="team-info">
            <p className="uaeteam-text teamvisma-text">With Jonas Vingegaard as team leader, Visma | Lease a Bike continues to be a major force in professional cycling.</p>
            <div className="team-achievements">
              <h3>Key Achievements:</h3>
              <ul>
                <li>Tour de France: 2x Winner (2022, 2023 - Jonas Vingegaard)</li>
                <li>Vuelta a España: 1x Winner (2022 - Remco Evenepoel)</li>
                <li>UCI Road World Championships Road Race: Recent Podium Finishes</li>
                <li>Multiple Stage Race Victories</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
  
      <div data-header-accent="blue" id='sky' className="section teamsky section d-flex align-center">
        <div className="container d-flex align-center justify-center f-column">
          <h1 data-entrance className="teamvisma-title">Team Sky | INEOS Grenadiers</h1>
          <section data-entrance className="team-info">
            <p className="uaeteam-text teamvisma-text">With 7 Tour de France victories in just eight years, INEOS Grenadiers redefined dominance in professional cycling.</p>
            <div className="team-achievements">
              <h3>Key Achievements:</h3>
              <ul>
                <li>Tour de France: 7x Winner (2012-2018 - Bradley Wiggins, Chris Froome, Geraint Thomas)</li>
                <li>Giro d'Italia: 3x Winner (2013, 2018, 2022)</li>
                <li>UCI Road World Championships: Multiple Victories</li>
                <li>Olympic Gold Medals in Cycling</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
  
      <div data-header-accent="yellow" id='astana' className="section astana section d-flex align-center">
        <div className="container d-flex align-center justify-center f-column">
          <h1 data-entrance className="teamvisma-title">Astana Qazaqstan Team</h1>
          <section data-entrance className="team-info">
            <p className="uaeteam-text teamvisma-text">A team built on resilience and strategy, Astana Qazaqstan Team has showcased its strength on cycling's biggest stage.</p>
            <div className="team-achievements">
              <h3>Key Achievements:</h3>
              <ul>
                <li>Tour de France: 1x Winner (2014 - Vincenzo Nibali)</li>
                <li>Giro d'Italia: 1x Winner (2015 - Fabio Aru)</li>
                <li>Vuelta a España: 1x Winner (2015 - Fabio Aru)</li>
                <li>Multiple Grand Tour Stage Victories</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
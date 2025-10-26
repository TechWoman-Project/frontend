import Image from "next/image";
import logoMeca from "@/../public/assets/logoMeca.png";
import logo from "@/../public/assets/logo.png";

export default function Header() {
  return (
    <header className="tw-header">
      <Image
        src={logoMeca}
        alt="Logo Meca"
        className="tw-logo"
        style={{
          width: "95px",
          height: "80px",
        }}
      />
      <Image src={logo} alt="Tech Woman Logo" className="tw-logo" />
    </header>
  );
}

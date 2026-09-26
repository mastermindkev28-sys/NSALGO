import type { Metadata } from "next";
import { Container, PageHero } from "@/components/marketing/section";
import { Panel, PanelBody } from "@/components/ui/panel";
import { SITE } from "@/config/site";
import { ContactForm } from "@/features/contact/contact-form";

export const metadata: Metadata = { title: "Contact", description: "Contact NSALGO about membership, billing, data providers, partnerships or press.", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Contact" title="Talk to NSALGO." description="Questions about membership, billing, data coverage or partnerships." />
      <Container className="grid gap-8 py-12 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <PanelBody className="p-6 sm:p-8">
            <ContactForm />
          </PanelBody>
        </Panel>
        <div className="space-y-6 text-[13.5px] text-steel-400">
          <div>
            <div className="eyebrow mb-2">Support</div>
            <p className="text-steel-200">{SITE.supportEmail}</p>
          </div>
          <div>
            <div className="eyebrow mb-2">Please note</div>
            <p>We can&apos;t provide individualized investment advice or comment on specific trades. For data-accuracy reports, include the symbol, module and timestamp shown.</p>
          </div>
        </div>
      </Container>
    </>
  );
}

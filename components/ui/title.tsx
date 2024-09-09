type Props = {
    text: string;
};

export default function Title({ text }: Props) {
    return <h1 className="font-semibold text-lg">{text}</h1>;
}
